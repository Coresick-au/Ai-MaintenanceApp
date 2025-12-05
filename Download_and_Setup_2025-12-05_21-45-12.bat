@echo off
title AI Maintenance App - Download and Setup
color 0A

echo.
echo ========================================
echo   AI Maintenance App - Easy Setup
echo ========================================
echo.
echo This script will help you download and setup
echo the AI Maintenance App for equipment calibration.
echo.
echo ========================================
echo.

echo Opening download page in your browser...
start "" "https://github.com/Coresick-au/Ai-MaintenanceApp/archive/refs/heads/main.zip"

echo.
echo Download Instructions:
echo -----------------------
echo 1. The download should start automatically
echo 2. Save the ZIP file to your Desktop
echo 3. Right-click the ZIP file and select "Extract All..."
echo 4. Open the extracted folder
echo 5. Double-click this file again to continue setup
echo.

pause

echo.
echo ========================================
echo   Installation Steps
echo ========================================
echo.
echo Step 1: Install Node.js (if not already installed)
echo Opening Node.js download page...
start "" "https://nodejs.org/en/download/"

echo.
echo Step 2: Install application dependencies
echo.
echo After Node.js is installed:
echo - Open command prompt in the project folder
echo - Type: npm install
echo - Type: npm start
echo - Open browser to: http://localhost:3000
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo For support or questions:
echo GitHub: https://github.com/Coresick-au/Ai-MaintenanceApp
echo.
echo.

pause
