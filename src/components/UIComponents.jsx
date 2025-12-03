import React, { useState, useEffect, useRef, Component } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

// ==========================================
// HELPER: DATE FORMATTER
// ==========================================
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let result = `${day}-${month}-${year}`;

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    result += ` ${hours}:${minutes}`;
  }

  return result;
};

// ==========================================
// ICONS
// ==========================================
import {
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Search,
  Scale,
  Settings,
  Clock,
  Database,
  Wrench,
  Edit,
  Plus,
  X,
  Printer,
  MapPin,
  FileText,
  Grid,
  ArrowLeft,
  Building,
  Upload,
  Trash,
  User,
  MessageCircle,
  Download,
  UploadCloud,
  ArrowUpDown,
  History,
  Briefcase,
  Phone,
  Mail,
  Contact,
  Save,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  FileSpreadsheet,
  Archive,
  Copy,
  Zap,
  Cpu,
  Orbit,
  Rocket,
  Undo,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2
} from 'lucide-react';

export const Icons = {
  Activity: (props) => <Activity size={18} className="mr-1" {...props} />,
  Calendar: (props) => <Calendar size={18} className="mr-1" {...props} />,
  AlertTriangle: (props) => <AlertTriangle size={18} className="mr-1" {...props} />,
  CheckCircle: (props) => <CheckCircle size={18} className="mr-1" {...props} />,
  Search: (props) => <Search size={18} className="mr-1" {...props} />,
  Scale: (props) => <Scale size={18} className="mr-1" {...props} />,
  Settings: (props) => <Settings size={18} className="mr-1" {...props} />,
  Clock: (props) => <Clock size={18} className="mr-1" {...props} />,
  Database: (props) => <Database size={18} className="mr-1" {...props} />,
  Wrench: (props) => <Wrench size={18} className="mr-1" {...props} />,
  Edit: (props) => <Edit size={18} {...props} />,
  Plus: (props) => <Plus size={18} className="mr-2" {...props} />,
  X: (props) => <X size={18} {...props} />,
  Printer: (props) => <Printer size={18} {...props} />,
  MapPin: (props) => <MapPin size={18} className="mr-1" {...props} />,
  FileText: (props) => <FileText size={18} className="mr-1" {...props} />,
  Grid: (props) => <Grid size={18} className="mr-1" {...props} />,
  ArrowLeft: (props) => <ArrowLeft size={18} className="mr-1" {...props} />,
  Building: (props) => <Building size={18} {...props} />,
  Upload: (props) => <Upload size={18} className="mr-1" {...props} />,
  Trash: (props) => <Trash size={18} className="mr-1" {...props} />,
  User: (props) => <User size={18} className="mr-1" {...props} />,
  MessageCircle: (props) => <MessageCircle size={18} className="mr-1" {...props} />,
  Download: (props) => <Download size={18} className="mr-1" {...props} />,
  UploadCloud: (props) => <UploadCloud size={18} className="mr-1" {...props} />,
  Sort: (props) => <ArrowUpDown size={18} className="mr-1" {...props} />,
  History: (props) => <History size={18} className="mr-1" {...props} />,
  Undo: (props) => <Undo size={18} {...props} />,
  Briefcase: (props) => <Briefcase size={18} className="mr-1" {...props} />,
  Phone: (props) => <Phone size={18} className="mr-1" {...props} />,
  Mail: (props) => <Mail size={18} className="mr-1" {...props} />,
  Contact: (props) => <Contact size={18} {...props} />,
  Save: (props) => <Save size={18} {...props} />,
  Cancel: (props) => <Ban size={18} {...props} />,
  ChevronLeft: (props) => <ChevronLeft size={18} {...props} />,
  ChevronRight: (props) => <ChevronRight size={18} {...props} />,
  ChevronUp: (props) => <ChevronUp size={18} {...props} />,
  ChevronDown: (props) => <ChevronDown size={18} {...props} />,
  SortAsc: (props) => <ChevronUp size={14} className="ml-1" {...props} />,
  SortDesc: (props) => <ChevronDown size={14} className="ml-1" {...props} />,
  CheckSquare: (props) => <CheckSquare size={18} {...props} />,
  FileCsv: (props) => <FileSpreadsheet size={18} {...props} />,
  Archive: (props) => <Archive size={18} {...props} />,
  Copy: (props) => <Copy size={18} {...props} />,
  Zap: (props) => <Zap size={18} {...props} />,
  Cpu: (props) => <Cpu size={18} {...props} />,
  Orbit: (props) => <Orbit size={18} {...props} />,
  Rocket: (props) => <Rocket size={18} {...props} />,
  Maximize: (props) => <Maximize size={18} {...props} />,
  Minimize: (props) => <Minimize size={18} {...props} />,
  Maximize2: (props) => <Maximize2 size={18} {...props} />,
  Minimize2: (props) => <Minimize2 size={18} {...props} />,
};

// ==========================================
// UI COMPONENTS (DARK THEME)
// ==========================================

export const Card = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`rounded-xl transition-colors duration-200 ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, disabled, className = "", variant = "primary", type = "button" }) => {
  let baseStyle = "px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 backdrop-blur-sm ";

  // --- UPDATED BUTTON STYLES (FUTURISTIC) ---
  // 1. Primary: Neon Blue/Cyan Glow
  if (variant === "primary") baseStyle += "bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:border-cyan-400 ";

  // 2. Secondary: Dark Metallic
  else if (variant === "secondary") baseStyle += "bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 ";

  // 3. Orange: Neon Orange/Amber
  else if (variant === "orange") baseStyle += "bg-orange-500/10 text-orange-400 border border-orange-500/50 hover:bg-orange-500/20 hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:border-orange-400 ";

  // 4. Danger: Neon Red
  else if (variant === "danger") baseStyle += "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:border-red-400 ";

  // 5. Risk Levels
  else if (variant === "risk-active") baseStyle += "bg-red-900/20 text-red-400 border border-red-500/30 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)] ";
  else if (variant === "risk-inactive") baseStyle += "bg-slate-800/30 text-slate-500 border border-slate-800 ";

  if (disabled) baseStyle += "opacity-50 cursor-not-allowed grayscale ";

  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${className}`}>{children}</button>;
};

// FullScreenContainer Component
export const FullScreenContainer = ({ children, className = "", title, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
        if (onClose) onClose();
      }
    };
    if (isFullScreen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen, onClose]);

  const toggleFullScreen = (e) => {
    e.stopPropagation();
    if (isFullScreen && onClose) {
      onClose();
    }
    setIsFullScreen(!isFullScreen);
  };

  const content = (
    <>
      {/* Header for Full Screen Mode */}
      {isFullScreen && title && (
        <div className="mb-4 pb-4 border-b border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleFullScreen}
        className={`
            absolute top-2 right-2 z-50 p-2 rounded-lg shadow-lg transition-all duration-200 border
            ${isFullScreen
            ? 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'
            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50 opacity-0 group-hover:opacity-100 hover:bg-cyan-500 hover:text-white hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]'
          }
            `}
        title={isFullScreen ? "Exit Full Screen (Esc)" : "Expand View"}
      >
        {isFullScreen ? <Icons.Minimize2 size={20} /> : <Icons.Maximize2 size={20} />}
      </button>

      {/* Content Content - ensures children take remaining space in FS mode */}
      <div className="flex-1 min-h-0 w-full relative flex flex-col">
        {children}
      </div>
    </>
  );

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0">
        <div className="w-[90%] h-[90%] bg-slate-900 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden relative p-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ease-in-out group relative flex flex-col overflow-visible ${className}`}>
      {content}
    </div>
  );
};

export const LongPressButton = ({ onLongPress, duration = 3000, children, className = "" }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const startPress = () => {
    setIsPressing(true);
    let elapsed = 0;
    const step = 50; // Update every 50ms

    intervalRef.current = setInterval(() => {
      elapsed += step;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= duration) {
        clearInterval(intervalRef.current);
        onLongPress();
        setIsPressing(false);
        setProgress(0);
      }
    }, step);
  };

  const cancelPress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPressing(false);
    setProgress(0);
  };

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      className={`relative overflow-hidden select-none ${className}`}
    >
      {/* Circular Progress Overlay */}
      {isPressing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-slate-500/50"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-red-500 transition-all duration-75 ease-linear"
              strokeDasharray={88}
              strokeDashoffset={88 - (88 * progress) / 100}
            />
          </svg>
        </div>
      )}

      <span className="relative z-0">{children}</span>
    </button>
  );
};

export const StatusBadge = ({ remaining, isActive }) => {
  if (isActive === false) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-400 border border-slate-600 shadow-sm"><Icons.Archive /> Archived</span>;
  if (remaining < 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/50 text-red-300 border border-red-800 shadow-sm"><Icons.AlertTriangle /> Overdue</span>;
  if (remaining < 30) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-900/50 text-yellow-300 border border-yellow-800 shadow-sm"><Icons.Clock /> Due Soon</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-900/50 text-green-300 border border-green-800 shadow-sm"><Icons.CheckCircle /> Good</span>;
};

export const SimpleBarChart = ({ data, onBarClick }) => {
  // 1. Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
        <Icons.Scale className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">No data available for chart</span>
      </div>
    );
  }

  return (
    // 2. IMPORTANT: The container must have a fixed height (h-64)
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />

          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            cursor={{ fill: '#334155', opacity: 0.4 }}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }}
            itemStyle={{ color: '#f1f5f9' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
          />

          <Bar
            dataKey="remaining"
            radius={[4, 4, 0, 0]}
            onClick={onBarClick}
            cursor={onBarClick ? 'pointer' : 'default'}
          >
            {/* 3. Color Logic: Red (Overdue), Amber (Due Soon), Emerald (Good) */}
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.remaining < 0 ? '#dc2626' : entry.remaining < 30 ? '#f59e0b' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CalendarWidget = ({ assets, selectedAssetId, onAssetSelect, expandedSection, setExpandedSection }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('quarter');

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changePeriod = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + direction);
    else if (view === 'quarter') newDate.setMonth(newDate.getMonth() + (direction * 3));
    else if (view === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    setCurrentDate(newDate);
  };

  const renderMonth = (date, mini = false) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAssets = assets.filter(a => a.dueDate === dayDateStr && a.active !== false);
      const isDue = dayAssets.length > 0;
      const isOverdue = dayAssets.some(a => a.remaining < 0);
      const isDueSoon = dayAssets.some(a => a.remaining >= 0 && a.remaining < 30);
      const isSelected = dayAssets.some(a => a.id === selectedAssetId);

      days.push(
        <div
          key={d}
          onClick={() => isDue && onAssetSelect && onAssetSelect(dayAssets[0].id)}
          className={`h-8 flex flex-col items-center justify-center relative border rounded transition-all ${isSelected ? 'bg-cyan-900 border-cyan-500 ring-2 ring-cyan-400 z-10' : 'border-transparent hover:bg-slate-700'} ${isDue ? 'font-bold cursor-pointer' : ''}`}
          title={isDue ? dayAssets.map(a => a.name).join(', ') : ''}
        >
          <span className={`text-xs ${isDue ? (isOverdue ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-slate-400') : 'text-slate-400'}`}>{d}</span>
          {isDue && (
            <div className="flex gap-0.5 mt-0.5">
              {dayAssets.slice(0, 3).map((_, i) => <div key={i} className={`w-1 h-1 rounded-full ${isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-500' : 'bg-slate-500'}`}></div>)}
            </div>
          )}
        </div>
      );
    }

    const monthName = date.toLocaleString('default', { month: 'long' });

    return (
      <div className={`bg-slate-800 border border-slate-700 rounded-lg p-2 ${mini ? 'text-[10px]' : ''}`}>
        <div className="text-center font-bold text-slate-300 mb-2 text-xs uppercase tracking-wider">{monthName} {mini ? '' : year}</div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-[9px] text-slate-500 font-bold">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  let content;
  let title;

  if (view === 'month') {
    title = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    content = <div className="max-w-sm mx-auto">{renderMonth(currentDate)}</div>;
  } else if (view === 'quarter') {
    const currentMonth = currentDate.getMonth();
    const qStartMonth = Math.floor(currentMonth / 3) * 3;
    const months = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentDate.getFullYear(), qStartMonth + i, 1);
      months.push(d);
    }
    title = `Q${Math.floor(qStartMonth / 3) + 1} ${currentDate.getFullYear()}`;
    content = (
      <div className="grid grid-cols-3 gap-4">
        {months.map((m, i) => <div key={i}>{renderMonth(m)}</div>)}
      </div>
    );
  } else {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
    title = `${year}`;
    content = (
      <div className="grid grid-cols-4 gap-2">
        {months.map((m, i) => <div key={i}>{renderMonth(m, true)}</div>)}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-4 no-print">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg text-cyan-400 bg-cyan-900/30 p-1 rounded"><Icons.Calendar /></span>
          <h3 className="font-bold text-slate-200">Maintenance Calendar</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-700 rounded p-1">
            {['month', 'quarter', 'year'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${view === v ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changePeriod(-1)} className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"><Icons.ChevronLeft /></button>
            <span className="font-bold text-sm w-24 text-center text-slate-200">{title}</span>
            <button onClick={() => changePeriod(1)} className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"><Icons.ChevronRight /></button>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};

export const Modal = ({ title, onClose, children, size = "md" }) => {
  // Determine max width based on size prop
  const maxWidth = size === "max" ? "max-w-7xl" : size === "lg" ? "max-w-4xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><Icons.X /></button>
        </div>
        <div className="p-4 text-slate-700 dark:text-slate-300">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export const EditableCell = ({ value, type = "text", onSave, className = "" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTempValue(value || ''); }, [value]);
  const handleBlur = () => { setIsEditing(false); if (tempValue !== value) onSave(tempValue); };

  if (isEditing) {
    if (type === 'date') {
      return (
        <DatePicker
          selected={tempValue ? new Date(tempValue) : null}
          onChange={(date) => {
            setTempValue(date ? date.toISOString().split('T')[0] : '');
            onSave(date ? date.toISOString().split('T')[0] : ''); // Save immediately on date selection
            setIsEditing(false); // Close after selection
          }}
          onBlur={handleBlur}
          onClickOutside={handleBlur}
          dateFormat="dd-MM-yyyy"
          className={`w-full p-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white z-20 relative ${className}`}
          calendarClassName="react-datepicker-custom-calendar"
          popperPlacement="auto"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    return <input autoFocus type={type} value={tempValue || ''} onChange={(e) => setTempValue(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()} onClick={(e) => e.stopPropagation()} className={`w-full p-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white z-20 relative ${className}`} />;
  }

  const displayValue = type === 'date' && value ? formatDate(value) : (value || '');
  return <div onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500 rounded px-1 -mx-1 relative group flex items-center gap-1 min-h-[24px] ${className}`}>{displayValue} <span className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 ml-1 text-xs no-print"><Icons.Edit /></span></div>;
};

// ==========================================
// ERROR BOUNDARY
// ==========================================
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // eslint-disable-next-line no-unused-vars
  static getDerivedStateFromError(_) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2"><Icons.AlertTriangle /> Something went wrong</h2>
            <p className="text-slate-300 mb-4">An error occurred while rendering this component.</p>
            <details className="bg-slate-950 p-4 rounded text-xs font-mono text-slate-400 overflow-auto max-h-96">
              <summary className="cursor-pointer mb-2 font-bold text-slate-300">Error Details</summary>
              <div className="mb-2 font-bold text-red-300">{this.state.error && this.state.error.toString()}</div>
              <pre className="whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
            </details>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Icons.Sort /> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
