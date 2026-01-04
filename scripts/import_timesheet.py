"""
Timesheet Excel Importer - Matches TimesheetApp Data Model

This script imports legacy Excel timesheets into Firebase Firestore,
matching the exact schema used by the TimesheetApp.

Reference:
- TimesheetEntry interface: src/apps/TimesheetApp/types/index.ts
- Week utilities: src/apps/TimesheetApp/utils/weekUtils.ts
- Calculator: src/apps/TimesheetApp/utils/calculator.ts

Usage:
    pip install pandas openpyxl firebase-admin
    python scripts/import_timesheet.py
"""

import pandas as pd
import os
import glob
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple

# ==========================================
# CONFIGURATION
# ==========================================

# Target user ID - change this for each person's timesheets
TARGET_USER_ID = "jWwcbKr9GLddIvJJMKRkWsndymO2"

# Path to folder containing Excel timesheet files
TIMESHEET_FOLDER_PATH = r"C:\path\to\your\timesheets"

# Base rate hour limit (37.5 hours/week = 7.5 hours/day * 5 days)
BASE_RATE_LIMIT = 37.5

# Dry run mode - set to False to actually upload to Firestore
DRY_RUN = True

# ==========================================
# MAPPINGS (Match TimesheetApp types/index.ts)
# ==========================================

# Map Excel day columns to full day names (as required by app)
DAY_COLUMN_MAP = {
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday',
    'SUN': 'Sunday'
}

# Map Excel PAYROLL CATEGORY to ActivityType enum
# Adjust these based on your Excel categories
ACTIVITY_TYPE_MAP = {
    'base hourly': 'Site',
    'base': 'Site',
    'site': 'Site',
    'travel': 'Travel',
    'workshop': 'Workshop',
    'office': 'Office',
    'training': 'Training',
    'induction': 'Site Induction',
    'site induction': 'Site Induction',
    'sales': 'Sales',
    'recovery': 'Recovery Time',
    'recovery time': 'Recovery Time',
    'reporting': 'Reporting',
    'annual leave': 'Annual Leave',
    'leave': 'Annual Leave',
    'public holiday': 'Public Holiday',
    'sick leave': 'Sick Leave',
    'sick': 'Sick Leave',
    'ot 1.5x': 'Site',  # Overtime is same activity, different rate
    'ot 2x': 'Site',
    'overtime': 'Site',
    'n/a': 'N/A',
}

# Payroll category to rate type mapping
RATE_TYPE_MAP = {
    'base hourly': {'rateMultiplier': 1.0, 'payType': 'base'},
    'base': {'rateMultiplier': 1.0, 'payType': 'base'},
    'ot 1.5x': {'rateMultiplier': 1.5, 'payType': 'overtime'},
    'ot 2x': {'rateMultiplier': 2.0, 'payType': 'overtime'},
    'overtime 1.5': {'rateMultiplier': 1.5, 'payType': 'overtime'},
    'overtime 2.0': {'rateMultiplier': 2.0, 'payType': 'overtime'},
}

# Valid ActivityType values from the app
VALID_ACTIVITY_TYPES = [
    'Site', 'Travel', 'Workshop', 'Office', 'Training',
    'Site Induction', 'Sales', 'Recovery Time', 'Reporting',
    'Annual Leave', 'Public Holiday', 'Sick Leave', 'N/A'
]

# ==========================================
# ISO WEEK UTILITIES (Match weekUtils.ts)
# ==========================================

def get_iso_week_number(date: datetime) -> int:
    """
    Gets the ISO week number for a date.
    ISO weeks start on Monday; Week 1 is the week with the first Thursday.
    Matches: weekUtils.ts → getISOWeekNumber()
    """
    return date.isocalendar()[1]

def get_iso_week_year(date: datetime) -> int:
    """
    Gets the ISO week year (may differ from calendar year at year boundaries).
    Matches: weekUtils.ts → getISOWeekYear()
    """
    return date.isocalendar()[0]

def get_week_key(monday_date: datetime) -> str:
    """
    Generates a week key for database storage/lookup.
    Format: YYYY-WXX (e.g., 2026-W01)
    Matches: weekUtils.ts → getWeekKey()
    """
    year = get_iso_week_year(monday_date)
    week = get_iso_week_number(monday_date)
    return f"{year}-W{week:02d}"

def get_week_start(date: datetime) -> datetime:
    """
    Gets the Monday of the week containing a given date.
    Matches: weekUtils.ts → getWeekStart()
    """
    # weekday() returns 0 for Monday, 6 for Sunday
    days_since_monday = date.weekday()
    monday = date - timedelta(days=days_since_monday)
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)

def to_iso_date_string(date: datetime) -> str:
    """
    Formats a Date to ISO date string (YYYY-MM-DD) for storage.
    Matches: weekUtils.ts → toISODateString()
    """
    return date.strftime('%Y-%m-%d')

# ==========================================
# FILENAME PARSING
# ==========================================

def parse_filename_metadata(file_path: str) -> Optional[Dict]:
    """
    Parse timesheet filename to extract week metadata.
    Expected patterns:
      - YYYY.MM.DD-WW (e.g., 2025.02.02-05) where date is Sunday
      - Various other formats with embedded dates
    
    Returns dict with weekKey and monday_date, or None if parsing fails.
    """
    filename = os.path.basename(file_path)
    
    # Pattern: YYYY.MM.DD-WeekNumber (e.g., 2025.02.02-05)
    match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})-(\d{2})", filename)
    if match:
        year, month, day, week_num = match.groups()
        sunday_date = datetime(int(year), int(month), int(day))
        # Calculate Monday (6 days before Sunday)
        monday_date = sunday_date - timedelta(days=6)
        week_key = get_week_key(monday_date)
        return {
            "weekKey": week_key,
            "monday_date": monday_date,
            "filename": filename
        }
    
    # Alternative pattern: just YYYY-MM-DD (assume it's Monday)
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", filename)
    if match:
        year, month, day = match.groups()
        monday_date = datetime(int(year), int(month), int(day))
        week_key = get_week_key(monday_date)
        return {
            "weekKey": week_key,
            "monday_date": monday_date,
            "filename": filename
        }
    
    return None

# ==========================================
# EXCEL PARSING
# ==========================================

def find_header_row(df_raw: pd.DataFrame) -> Optional[int]:
    """Find the row containing 'PAYROLL CATEGORY' header."""
    for idx, row in df_raw.iterrows():
        row_values = ' '.join(str(v).upper() for v in row.values if pd.notna(v))
        if 'PAYROLL CATEGORY' in row_values:
            return idx
    return None

def find_date_row(df: pd.DataFrame, day_cols: List[str]) -> Optional[Dict[str, datetime]]:
    """
    Find the row with actual dates for each day column.
    Returns mapping like {'Monday': datetime(2025, 1, 27), ...}
    """
    # Look in the first few rows after header for date values
    for idx in range(min(3, len(df))):
        row = df.iloc[idx]
        dates = {}
        found_date = False
        
        for col in day_cols:
            if col in df.columns:
                val = row.get(col)
                if isinstance(val, (datetime, pd.Timestamp)):
                    dates[DAY_COLUMN_MAP.get(col, col)] = pd.to_datetime(val).to_pydatetime()
                    found_date = True
                elif isinstance(val, str) and re.match(r'\d{1,2}/\d{1,2}/\d{2,4}', val):
                    dates[DAY_COLUMN_MAP.get(col, col)] = pd.to_datetime(val, dayfirst=True).to_pydatetime()
                    found_date = True
        
        if found_date and len(dates) >= 3:  # At least some dates found
            return dates
    
    return None

def map_activity_type(category_str: str, customer_activity: str = '') -> str:
    """
    Map Excel category/activity to valid ActivityType enum value.
    Falls back to 'Site' if no match found.
    """
    # Try payroll category first
    category_lower = str(category_str).strip().lower()
    if category_lower in ACTIVITY_TYPE_MAP:
        return ACTIVITY_TYPE_MAP[category_lower]
    
    # Try customer activity column
    activity_lower = str(customer_activity).strip().lower()
    if activity_lower in ACTIVITY_TYPE_MAP:
        return ACTIVITY_TYPE_MAP[activity_lower]
    
    # Check for partial matches
    for key, value in ACTIVITY_TYPE_MAP.items():
        if key in category_lower or key in activity_lower:
            return value
    
    # Default to 'Site' for unknown categories
    return 'Site'

def get_rate_info(category_str: str) -> Dict[str, Any]:
    """Get rate multiplier and pay type from payroll category."""
    category_lower = str(category_str).strip().lower()
    return RATE_TYPE_MAP.get(category_lower, {'rateMultiplier': 1.0, 'payType': 'base'})

def calculate_dates_from_monday(monday_date: datetime) -> Dict[str, datetime]:
    """Calculate all dates for the week from Monday."""
    return {
        'Monday': monday_date,
        'Tuesday': monday_date + timedelta(days=1),
        'Wednesday': monday_date + timedelta(days=2),
        'Thursday': monday_date + timedelta(days=3),
        'Friday': monday_date + timedelta(days=4),
        'Saturday': monday_date + timedelta(days=5),
        'Sunday': monday_date + timedelta(days=6),
    }

# ==========================================
# ENTRY BUILDING
# ==========================================

def create_timesheet_entry(
    user_id: str,
    week_key: str,
    day: str,
    date: datetime,
    hours: float,
    category: str,
    customer_activity: str = '',
    job_no: str = '',
    notes: str = ''
) -> Dict[str, Any]:
    """
    Create a TimesheetEntry object matching the app's interface.
    
    Reference: src/apps/TimesheetApp/types/index.ts → TimesheetEntry
    """
    rate_info = get_rate_info(category)
    activity = map_activity_type(category, customer_activity)
    
    # Calculate default start/finish times based on stacking logic
    # For import, we use simplified mode with just hours
    entry = {
        # Required fields
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "weekKey": week_key,
        "day": day,  # Full day name: "Monday", "Tuesday", etc.
        "date": to_iso_date_string(date),
        
        # Time fields - using simplified mode
        "startTime": "",  # Will be calculated by app or left for simplified mode
        "finishTime": "",
        "breakDuration": 0.0,
        
        # Activity fields
        "activity": activity,
        "jobNo": str(job_no).strip() if pd.notna(job_no) else "",
        
        # Flags
        "isNightshift": False,
        "isOvernight": False,
        "perDiemType": "none",  # 'none' | 'half' | 'full'
        
        # Notes and status
        "notes": str(notes).strip() if pd.notna(notes) else "",
        "status": "draft",
        
        # Simplified entry mode fields
        "entryMode": "simplified",
        "hoursOnly": round(hours, 2),
        
        # Timestamps
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }
    
    return entry

# ==========================================
# SHEET VALIDATION & PARSING
# ==========================================

def validate_and_parse_sheet(file_path: str) -> Tuple[Optional[List[Dict]], str]:
    """
    Validate and parse an Excel timesheet file.
    
    Returns:
        (entries, status_message)
        - entries: List of TimesheetEntry dicts, or None if validation failed
        - status_message: "Success" or error description
    """
    meta = parse_filename_metadata(file_path)
    if not meta:
        return None, "Invalid filename format - cannot extract week info"
    
    week_key = meta['weekKey']
    monday_date = meta['monday_date']
    week_dates = calculate_dates_from_monday(monday_date)
    
    # Read the 'Timesheet' tab
    try:
        df_raw = pd.read_excel(file_path, sheet_name='Timesheet', header=None)
    except ValueError as e:
        if "Worksheet named 'Timesheet' not found" in str(e):
            # Try first sheet
            df_raw = pd.read_excel(file_path, sheet_name=0, header=None)
        else:
            return None, f"Could not read sheet: {str(e)}"
    except Exception as e:
        return None, f"Could not read file: {str(e)}"
    
    # Find header row
    header_row_idx = find_header_row(df_raw)
    if header_row_idx is None:
        return None, "Could not find PAYROLL CATEGORY header row"
    
    # Re-read with proper header
    df = pd.read_excel(file_path, sheet_name='Timesheet' if 'Timesheet' in pd.ExcelFile(file_path).sheet_names else 0, header=header_row_idx)
    
    # Normalize column names
    df.columns = df.columns.str.strip().str.upper()
    
    # Define expected columns
    day_cols = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    
    # Validate base rate limit
    base_hours_total = 0.0
    for _, row in df.iterrows():
        cat = str(row.get('PAYROLL CATEGORY', '')).strip().lower()
        if 'base' in cat and 'ot' not in cat:
            for d in day_cols:
                if d in df.columns:
                    val = pd.to_numeric(row.get(d), errors='coerce')
                    if pd.notna(val):
                        base_hours_total += val
    
    if base_hours_total > BASE_RATE_LIMIT:
        return None, f"ERROR: Base Rate ({base_hours_total:.1f} hrs) exceeds {BASE_RATE_LIMIT} limit. Please edit Excel."
    
    # Extract entries
    entries = []
    
    for _, row in df.iterrows():
        category = str(row.get('PAYROLL CATEGORY', '')).strip()
        if not category or category.lower() in ['nan', 'payroll category', 'total', 'totals']:
            continue
        
        customer_activity = str(row.get('CUSTOMER ACTIVITY', '')).strip() if 'CUSTOMER ACTIVITY' in df.columns else ''
        job_no = row.get('JOB #', '') if 'JOB #' in df.columns else ''
        if pd.isna(job_no):
            job_no = row.get('JOB', '') if 'JOB' in df.columns else ''
        
        # Process each day column
        for day_col in day_cols:
            if day_col not in df.columns:
                continue
            
            hours_val = pd.to_numeric(row.get(day_col), errors='coerce')
            if pd.isna(hours_val) or hours_val <= 0:
                continue
            
            day_name = DAY_COLUMN_MAP[day_col]
            day_date = week_dates[day_name]
            
            entry = create_timesheet_entry(
                user_id=TARGET_USER_ID,
                week_key=week_key,
                day=day_name,
                date=day_date,
                hours=hours_val,
                category=category,
                customer_activity=customer_activity,
                job_no=job_no,
                notes=''
            )
            
            entries.append(entry)
    
    return entries, "Success"

# ==========================================
# FIRESTORE UPLOAD (Optional)
# ==========================================

def upload_to_firestore(entries: List[Dict]) -> bool:
    """
    Upload entries to Firestore 'timesheets' collection.
    
    Requires firebase-admin SDK with service account credentials.
    Set GOOGLE_APPLICATION_CREDENTIALS environment variable.
    """
    if DRY_RUN:
        print("DRY RUN - Skipping Firestore upload")
        return True
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        batch = db.batch()
        
        for entry in entries:
            doc_ref = db.collection('timesheets').document(entry['id'])
            batch.set(doc_ref, entry)
        
        batch.commit()
        print(f"✅ Uploaded {len(entries)} entries to Firestore")
        return True
        
    except ImportError:
        print("❌ firebase-admin not installed. Run: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"❌ Firestore upload failed: {e}")
        return False

# ==========================================
# MAIN
# ==========================================

def main():
    """Main entry point."""
    print("=" * 60)
    print("TIMESHEET EXCEL IMPORTER")
    print("Matches TimesheetApp Data Model")
    print("=" * 60)
    print(f"\nTarget User ID: {TARGET_USER_ID}")
    print(f"Source Folder: {TIMESHEET_FOLDER_PATH}")
    print(f"Dry Run Mode: {DRY_RUN}")
    print()
    
    if not os.path.exists(TIMESHEET_FOLDER_PATH):
        print(f"❌ Folder not found: {TIMESHEET_FOLDER_PATH}")
        print("Please update TIMESHEET_FOLDER_PATH in the script.")
        return
    
    files = sorted(glob.glob(os.path.join(TIMESHEET_FOLDER_PATH, "*.xlsx")))
    if not files:
        print(f"❌ No .xlsx files found in {TIMESHEET_FOLDER_PATH}")
        return
    
    print(f"Found {len(files)} Excel files\n")
    print("-" * 60)
    
    all_entries = []
    errors = []
    
    for f in files:
        basename = os.path.basename(f)
        
        # Skip temp files
        if basename.startswith("~$"):
            continue
        
        entries, status = validate_and_parse_sheet(f)
        
        if entries is None:
            print(f"❌ {basename}")
            print(f"   Error: {status}")
            errors.append((basename, status))
        else:
            print(f"✅ {basename}")
            print(f"   Week: {entries[0]['weekKey'] if entries else 'N/A'}")
            print(f"   Entries: {len(entries)}")
            all_entries.extend(entries)
    
    print("-" * 60)
    print(f"\nSUMMARY:")
    print(f"  Total entries extracted: {len(all_entries)}")
    print(f"  Files with errors: {len(errors)}")
    
    if errors:
        print("\n⚠️  ERRORS FOUND - Fix these before uploading:")
        for filename, error in errors:
            print(f"   • {filename}: {error}")
        return
    
    if not all_entries:
        print("\n⚠️  No entries to upload")
        return
    
    # Show sample entry
    print("\n📋 SAMPLE ENTRY (first one):")
    sample = all_entries[0]
    for key, value in sample.items():
        print(f"   {key}: {value}")
    
    # Upload if not dry run
    if DRY_RUN:
        print(f"\n🔸 DRY RUN complete. Set DRY_RUN=False to upload to Firestore.")
    else:
        print(f"\n📤 Uploading {len(all_entries)} entries to Firestore...")
        if upload_to_firestore(all_entries):
            print("✅ Upload complete!")
        else:
            print("❌ Upload failed")

if __name__ == "__main__":
    main()
