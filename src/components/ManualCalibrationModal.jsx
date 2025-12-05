import React, { useState, useEffect } from 'react';
import { Button, Modal } from './UIComponents';
import { Icons } from '../constants/icons.jsx';

export const ManualCalibrationModal = ({ isOpen, onClose, onSaveCalibrationData, asset }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [techNames, setTechNames] = useState(['']);
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState({
    // Basic Info
    date: new Date().toISOString().split('T')[0],
    techNames: [''],
    scaleCondition: '',
    
    // Tare/Zero
    oldTare: '',
    newTare: '',
    tareChange: '',
    tareRepeatability: '',
    
    // Span
    oldSpan: '',
    newSpan: '',
    spanChange: '',
    spanRepeatability: '',
    
    // Load Cell
    lcMvZero: '',
    lcMvSpan: '',
    
    // Belt & Speed
    beltSpeed: '',
    beltLength: '',
    testLength: '',
    testTime: '',
    
    // System Tests
    totaliserAsLeft: '',
    revTime: '',
    testRevolutions: '',
    pulses: '',
    simulatedRate: '',
    
    // Results
    targetWeight: '',
    
    // Comments
    comments: '',
    recommendations: '',
    
    // File naming
    jobNumber: '',
    jobCode: ''
  });

  // Auto-generate filename when date, job number, or code changes
  useEffect(() => {
    const { date, jobNumber, jobCode } = formData;
    if (date && (jobNumber || jobCode)) {
      const dateStr = date.replace(/-/g, '.');
      const jobPart = jobNumber && jobCode ? `${jobNumber}-${jobCode}` : jobNumber || jobCode;
      const newFileName = `${dateStr}-CALR-${jobPart}.pdf`;
      setFormData(prev => ({
        ...prev,
        fileName: newFileName
      }));
    } else if (date) {
      const dateStr = date.replace(/-/g, '.');
      const newFileName = `${dateStr}-CALR.pdf`;
      setFormData(prev => ({
        ...prev,
        fileName: newFileName
      }));
    }
  }, [formData.date, formData.jobNumber, formData.jobCode]);

  // Calculate tare change when old/new values change
  useEffect(() => {
    if (formData.oldTare && formData.newTare) {
      const oldValue = parseFloat(formData.oldTare);
      const newValue = parseFloat(formData.newTare);
      if (!isNaN(oldValue) && !isNaN(newValue) && oldValue !== 0) {
        const change = ((newValue - oldValue) / oldValue * 100).toFixed(2);
        setFormData(prev => ({ ...prev, tareChange: change }));
      }
    }
  }, [formData.oldTare, formData.newTare]);

  // Calculate span change when old/new values change
  useEffect(() => {
    if (formData.oldSpan && formData.newSpan) {
      const oldValue = parseFloat(formData.oldSpan);
      const newValue = parseFloat(formData.newSpan);
      if (!isNaN(oldValue) && !isNaN(newValue) && oldValue !== 0) {
        const change = ((newValue - oldValue) / oldValue * 100).toFixed(2);
        setFormData(prev => ({ ...prev, spanChange: change }));
      }
    }
  }, [formData.oldSpan, formData.newSpan]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechNameChange = (index, value) => {
    const newTechNames = [...techNames];
    newTechNames[index] = value;
    setTechNames(newTechNames);
    setFormData(prev => ({ ...prev, techNames: newTechNames.filter(name => name.trim()) }));
  };

  const addTechName = () => {
    setTechNames(prev => [...prev, '']);
  };

  const removeTechName = (index) => {
    const newTechNames = techNames.filter((_, i) => i !== index);
    setTechNames(newTechNames);
    setFormData(prev => ({ ...prev, techNames: newTechNames.filter(name => name.trim()) }));
  };

  const handleSave = () => {
    // Clear previous validation error
    setValidationError('');
    
    // Validate required fields
    const validTechNames = techNames.filter(name => name.trim());
    if (!formData.date || validTechNames.length === 0) {
      setValidationError('Please fill in at least the date and technician name(s) before saving.');
      return;
    }

    // Transform form data to report format
    const calibrationData = {
      ...formData,
      id: `rep-${Date.now()}`,
      technician: validTechNames.join(', '),
      fileName: formData.fileName || `${formData.date.replace(/-/g, '.')}-CALR.pdf`,
      // Map to existing report structure
      tareChange: parseFloat(formData.tareChange) || 0,
      spanChange: parseFloat(formData.spanChange) || 0,
      zeroMV: formData.lcMvZero || 'N/A',
      spanMV: formData.lcMvSpan || 'N/A',
      speed: parseFloat(formData.beltSpeed) || 'N/A',
      totaliser: parseFloat(formData.totaliser) || 'N/A',
      comments: formData.comments ? [{
        id: 1,
        text: formData.comments,
        status: 'Open'
      }] : []
    };

    onSaveCalibrationData(calibrationData);
    onClose();
  };

  const handleClose = () => {
    setValidationError('');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      techNames: [''],
      scaleCondition: '',
      oldTare: '',
      newTare: '',
      tareChange: '',
      tareRepeatability: '',
      oldSpan: '',
      newSpan: '',
      spanChange: '',
      spanRepeatability: '',
      lcMvZero: '',
      lcMvSpan: '',
      beltSpeed: '',
      beltLength: '',
      testLength: '',
      testTime: '',
      kgPerMeter: '',
      totaliserAsLeft: '',
      pulsesPerLength: '',
      revTime: '',
      testRevolutions: '',
      pulses: '',
      targetWeight: '',
      totaliser: '',
      comments: '',
      recommendations: '',
      jobNumber: '',
      jobCode: ''
    });
    setTechNames(['']);
    onClose();
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Icons.User },
    { id: 'tare', label: 'Tare/Zero', icon: Icons.Scale },
    { id: 'span', label: 'Span', icon: Icons.Activity },
    { id: 'loadcell', label: 'Load Cell', icon: Icons.Zap },
    { id: 'belt', label: 'Belt & Speed', icon: Icons.RotateCcw },
    { id: 'system', label: 'System Tests', icon: Icons.Cpu },
    { id: 'comments', label: 'Comments', icon: Icons.MessageCircle }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Report Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Technician Name(s)
                <button
                  type="button"
                  onClick={addTechName}
                  className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                >
                  <Icons.Plus size={12} /> Add Tech
                </button>
              </label>
              {techNames.map((name, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleTechNameChange(index, e.target.value)}
                    placeholder="Enter technician name"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {techNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTechName(index)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <Icons.Trash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Scale Condition</label>
              <textarea
                value={formData.scaleCondition}
                onChange={(e) => handleInputChange('scaleCondition', e.target.value)}
                placeholder="Describe the condition of the scale..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Job Number</label>
                <input
                  type="text"
                  value={formData.jobNumber}
                  onChange={(e) => handleInputChange('jobNumber', e.target.value)}
                  placeholder="e.g., 12345"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Job Code</label>
                <input
                  type="text"
                  value={formData.jobCode}
                  onChange={(e) => handleInputChange('jobCode', e.target.value)}
                  placeholder="e.g., ABC"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.fileName && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                <label className="block text-sm font-medium text-slate-300 mb-1">Generated Filename</label>
                <div className="text-sm text-blue-400 font-mono">{formData.fileName}</div>
              </div>
            )}
          </div>
        );

      case 'tare':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Tare/Zero Calibration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Old Tare/Zero</label>
                <input
                  type="number"
                  value={formData.oldTare}
                  onChange={(e) => handleInputChange('oldTare', e.target.value)}
                  placeholder="Enter old tare value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Tare/Zero</label>
                <input
                  type="number"
                  value={formData.newTare}
                  onChange={(e) => handleInputChange('newTare', e.target.value)}
                  placeholder="Enter new tare value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tare/Zero Change (%)</label>
                <input
                  type="number"
                  value={formData.tareChange}
                  onChange={(e) => handleInputChange('tareChange', e.target.value)}
                  placeholder="Enter tare change %"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tare/Zero Repeatability</label>
                <input
                  type="number"
                  value={formData.tareRepeatability}
                  onChange={(e) => handleInputChange('tareRepeatability', e.target.value)}
                  placeholder="Enter repeatability value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <Icons.Info size={16} className="inline mr-1" />
                Enter tare change as a percentage (e.g., 0.5 for +0.5% or -0.3 for -0.3%).
              </p>
            </div>
          </div>
        );

      case 'span':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Span Calibration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Old Span</label>
                <input
                  type="number"
                  value={formData.oldSpan}
                  onChange={(e) => handleInputChange('oldSpan', e.target.value)}
                  placeholder="Enter old span value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Span</label>
                <input
                  type="number"
                  value={formData.newSpan}
                  onChange={(e) => handleInputChange('newSpan', e.target.value)}
                  placeholder="Enter new span value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Span Change (%)</label>
                <input
                  type="number"
                  value={formData.spanChange}
                  onChange={(e) => handleInputChange('spanChange', e.target.value)}
                  placeholder="Enter span change %"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Span Repeatability</label>
                <input
                  type="number"
                  value={formData.spanRepeatability}
                  onChange={(e) => handleInputChange('spanRepeatability', e.target.value)}
                  placeholder="Enter repeatability value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <Icons.Info size={16} className="inline mr-1" />
                Enter span change as a percentage (e.g., 0.5 for +0.5% or -0.3 for -0.3%).
              </p>
            </div>
          </div>
        );

      case 'loadcell':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Load Cell Tests</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">LC mV@Zero - mV</label>
                <input
                  type="number"
                  value={formData.lcMvZero}
                  onChange={(e) => handleInputChange('lcMvZero', e.target.value)}
                  placeholder="Enter mV at zero"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">LC mV@Span - mV</label>
                <input
                  type="number"
                  value={formData.lcMvSpan}
                  onChange={(e) => handleInputChange('lcMvSpan', e.target.value)}
                  placeholder="Enter mV at span"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'belt':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Belt & Speed Tests</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Belt Speed - m/s</label>
                <input
                  type="number"
                  value={formData.beltSpeed}
                  onChange={(e) => handleInputChange('beltSpeed', e.target.value)}
                  placeholder="Enter belt speed"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Belt Length - m</label>
                <input
                  type="number"
                  value={formData.beltLength}
                  onChange={(e) => handleInputChange('beltLength', e.target.value)}
                  placeholder="Enter belt length"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Test Length - m</label>
                <input
                  type="number"
                  value={formData.testLength}
                  onChange={(e) => handleInputChange('testLength', e.target.value)}
                  placeholder="Enter test length"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Test Time - s</label>
                <input
                  type="number"
                  value={formData.testTime}
                  onChange={(e) => handleInputChange('testTime', e.target.value)}
                  placeholder="Enter test time"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">System Tests</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Totaliser As Left - t</label>
                <input
                  type="number"
                  value={formData.totaliserAsLeft}
                  onChange={(e) => handleInputChange('totaliserAsLeft', e.target.value)}
                  placeholder="Enter totaliser value"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Simulated Rate - t/h</label>
                <input
                  type="number"
                  value={formData.simulatedRate}
                  onChange={(e) => handleInputChange('simulatedRate', e.target.value)}
                  placeholder="Enter simulated rate"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rev Time - s</label>
                <input
                  type="number"
                  value={formData.revTime}
                  onChange={(e) => handleInputChange('revTime', e.target.value)}
                  placeholder="Enter revolution time"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Test Revolutions</label>
                <input
                  type="number"
                  value={formData.testRevolutions}
                  onChange={(e) => handleInputChange('testRevolutions', e.target.value)}
                  placeholder="Enter test revolutions"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Test Duration Pulses</label>
                <input
                  type="number"
                  value={formData.pulses}
                  onChange={(e) => handleInputChange('pulses', e.target.value)}
                  placeholder="Enter test duration pulse count"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Weight</label>
                <input
                  type="number"
                  value={formData.targetWeight}
                  onChange={(e) => handleInputChange('targetWeight', e.target.value)}
                  placeholder="Enter target weight"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'comments':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Comments & Recommendations</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => handleInputChange('comments', e.target.value)}
                placeholder="Enter any comments about the calibration..."
                rows={6}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recommendations</label>
              <textarea
                value={formData.recommendations}
                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                placeholder="Enter any recommendations for maintenance or follow-up..."
                rows={6}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      title="Manual Calibration Report" 
      onClose={handleClose}
      size="max"
    >
      <div className="space-y-6">
        {/* Asset Information */}
        {asset && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icons.Activity className="text-cyan-400" size={16} />
              <span className="text-sm font-semibold text-cyan-400">Target Asset</span>
            </div>
            <div className="text-white font-medium">{asset.name}</div>
            <div className="text-xs text-slate-400">{asset.code} • {asset.type}</div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg">
            <div className="flex items-start gap-3">
              <Icons.XCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-sm mt-1">{validationError}</p>
              </div>
              <button
                onClick={() => setValidationError('')}
                className="ml-auto text-red-400 hover:text-red-200 transition-colors"
              >
                <Icons.X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-700">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400 bg-blue-900/20'
                    : 'text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {formData.fileName && (
              <span className="flex items-center gap-2">
                <Icons.FileText size={16} />
                {formData.fileName}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleClose} 
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Icons.Save size={16} />
              Save Calibration Report
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
