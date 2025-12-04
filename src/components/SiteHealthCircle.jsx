import React from 'react';
import { getSiteHealthPercentages, getDominantHealthStatus } from '../utils/siteHealthCircle';

/**
 * Large circular health indicator showing percentage breakdown of site assets
 * 
 * @description Displays a donut chart showing the percentage of critical, warning,
 * and healthy assets with a dominant status indicator in the center.
 * @param {Object} props - Component props
 * @param {Object} props.site - Site data object
 * @param {number} props.size - Diameter of the circle in pixels (default: 80)
 * @param {boolean} props.showPercentage - Whether to show percentage in center (default: true)
 * @param {boolean} props.fullWidth - Whether to display as full-width bar (default: false)
 * @returns {JSX.Element} Circular health indicator component
 */
export const SiteHealthCircle = ({ site, size = 80, showPercentage = true, fullWidth = false }) => {
  const percentages = getSiteHealthPercentages(site);
  const dominantStatus = getDominantHealthStatus(percentages);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#ef4444'; // red-500
      case 'warning': return '#f59e0b'; // amber-500
      case 'healthy': return '#10b981'; // green-500
      default: return '#10b981';
    }
  };
  
  const getStatusBgColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      case 'healthy': return 'bg-green-500';
      default: return 'bg-green-500';
    }
  };
  
  const getStatusTextColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'healthy': return 'text-green-400';
      default: return 'text-green-400';
    }
  };
  
  if (percentages.total === 0) {
    // Empty state
    return (
      <div className="flex flex-col items-center gap-1">
        <div 
          className={`rounded-full ${getStatusBgColor('healthy')} opacity-20`}
          style={{ width: size, height: size }}
        />
        <span className="text-xs text-slate-400">No Assets</span>
      </div>
    );
  }
  
  // Full-width bar mode
  if (fullWidth) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Overall Health</span>
          <div className="flex items-center gap-2">
            {percentages.critical > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-red-400">{percentages.critical}%</span>
              </div>
            )}
            {percentages.warning > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-xs text-amber-400">{percentages.warning}%</span>
              </div>
            )}
            {percentages.healthy > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-400">{percentages.healthy}%</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Full-width progress bar */}
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden flex">
          {percentages.critical > 0 && (
            <div 
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${percentages.critical}%` }}
              title={`Critical: ${percentages.critical}%`}
            />
          )}
          {percentages.warning > 0 && (
            <div 
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${percentages.warning}%` }}
              title={`Warning: ${percentages.warning}%`}
            />
          )}
          {percentages.healthy > 0 && (
            <div 
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${percentages.healthy}%` }}
              title={`Healthy: ${percentages.healthy}%`}
            />
          )}
        </div>
        
        {/* Dominant status indicator */}
        <div className="mt-2 text-center">
          <span className={`text-sm font-bold ${getStatusTextColor(dominantStatus)}`}>
            {Math.max(percentages.critical, percentages.warning, percentages.healthy)}% {dominantStatus.charAt(0).toUpperCase() + dominantStatus.slice(1)}
          </span>
          <span className="text-xs text-slate-400 ml-2">({percentages.total} assets)</span>
        </div>
      </div>
    );
  }
  
  // Original circle mode
  const radius = (size - 8) / 2; // Account for stroke width
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash arrays for each segment
  const criticalLength = (percentages.critical / 100) * circumference;
  const warningLength = (percentages.warning / 100) * circumference;
  const healthyLength = (percentages.healthy / 100) * circumference;
  
  // Starting positions for each segment
  const criticalOffset = 0;
  const warningOffset = criticalLength;
  const healthyOffset = criticalLength + warningLength;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-700"
          />
          
          {/* Critical segment */}
          {percentages.critical > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getStatusColor('critical')}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${criticalLength} ${circumference}`}
              strokeDashoffset={criticalOffset}
              className="transition-all duration-500"
            />
          )}
          
          {/* Warning segment */}
          {percentages.warning > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getStatusColor('warning')}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${warningLength} ${circumference}`}
              strokeDashoffset={-warningOffset}
              className="transition-all duration-500"
            />
          )}
          
          {/* Healthy segment */}
          {percentages.healthy > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getStatusColor('healthy')}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${healthyLength} ${circumference}`}
              strokeDashoffset={-healthyOffset}
              className="transition-all duration-500"
            />
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <>
              <div className={`text-lg font-bold ${getStatusTextColor(dominantStatus)}`}>
                {Math.max(percentages.critical, percentages.warning, percentages.healthy)}%
              </div>
              <div className="text-xs text-slate-400 capitalize">
                {dominantStatus}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex gap-2 text-xs">
        {percentages.critical > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-red-400">{percentages.critical}%</span>
          </div>
        )}
        {percentages.warning > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-amber-400">{percentages.warning}%</span>
          </div>
        )}
        {percentages.healthy > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-green-400">{percentages.healthy}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
