import React from 'react';
import { Modal, Button, SecureDeleteButton, UniversalDatePicker } from './UIComponents';
import { Icons } from '../constants/icons.jsx';

// Dark Mode Styles
const inputClass = "w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors";
const labelClass = "block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider";

export const AddAssetModal = ({
  isOpen,
  onClose,
  onSave,
  newAsset,
  setNewAsset,
  activeTab
}) => {
  if (!isOpen) return null;

  return (
    <Modal title="Add New Asset" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Asset Name</label>
          <input
            className={inputClass}
            placeholder="Name"
            value={newAsset.name}
            onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Weigher</label>
            <input
              className={inputClass}
              placeholder="Weigher"
              value={newAsset.weigher}
              onChange={e => setNewAsset({ ...newAsset, weigher: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Code</label>
            <input
              className={inputClass}
              placeholder="Code"
              value={newAsset.code}
              onChange={e => setNewAsset({ ...newAsset, code: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Frequency (Months)</label>
          <input
            type="number"
            className={inputClass}
            placeholder={`Default: ${activeTab === 'service' ? 3 : 12}`}
            value={newAsset.frequency}
            onChange={e => setNewAsset({ ...newAsset, frequency: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Last Calibration</label>
          <UniversalDatePicker
            className={inputClass}
            selected={newAsset.lastCal ? new Date(newAsset.lastCal) : null}
            onChange={date => setNewAsset({ ...newAsset, lastCal: date ? date.toISOString().split('T')[0] : '' })}
            placeholderText="Select Date"
          />
        </div>
        <Button onClick={() => onSave(newAsset, activeTab)} className="w-full justify-center">Save Asset</Button>
      </div>
    </Modal>
  );
};

export const EditAssetModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingAsset,
  setEditingAsset,
  activeTab,
  specs,
  setSpecs,
  onSaveSpecs
}) => {
  if (!isOpen || !editingAsset) return null;

  return (
    <Modal title="Edit Asset & Specifications" onClose={onClose}>

      {/* Merged Asset Details & Specifications */}
      <div className="space-y-4">
        {/* === ASSET DETAILS (RENAMED LABELS) === */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Asset Name</label>
            <input
              className={inputClass}
              placeholder="Name"
              value={editingAsset.name}
              onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Weigher</label>
              <input
                className={inputClass}
                placeholder="Weigher"
                value={editingAsset.weigher}
                onChange={e => setEditingAsset({ ...editingAsset, weigher: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Asset Code</label>
              <input
                className={inputClass}
                placeholder="Code"
                value={editingAsset.code}
                onChange={e => setEditingAsset({ ...editingAsset, code: e.target.value })}
              />
            </div>
          </div>

          {/* Status Display */}
          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded border border-slate-600">
            <div>
              <div className="text-sm font-bold text-slate-300">Asset Status</div>
              <div className="text-xs text-slate-400">
                {editingAsset.active !== false ? 'Currently Active' : 'Currently Archived'}
              </div>
            </div>
            <div className={`px-3 py-1 text-xs font-bold rounded border ${editingAsset.active !== false ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-orange-900/30 text-orange-400 border-orange-900'}`}>
              {editingAsset.active !== false ? '✓ Active' : '📦 Archived'}
            </div>
          </div>
        </div>

        {/* === SPECIFICATIONS SECTION (MERGED CONTENT) === */}
        <div className="pt-4 border-t border-slate-700 space-y-4">
          {!specs ? (
            <div className="text-center py-8 text-slate-400">
              <p className="mb-4">No specifications found for this asset.</p>
              <Button
                onClick={() => {
                  setSpecs({
                    id: null,
                    weigher: editingAsset.weigher || '',
                    altCode: editingAsset.code || '',
                    description: editingAsset.name || '',
                    scaleType: '',
                    integratorController: '',
                    speedSensorType: '',
                    rollDims: '',
                    adjustmentType: '',
                    loadCellBrand: '',
                    loadCellSize: '',
                    loadCellSensitivity: '',
                    numberOfLoadCells: '',
                    billetWeightType: '',
                    billetWeightSize: '',
                    billetWeightIds: [], // Initialize as empty array
                    notes: []
                  });
                }}
                className="justify-center"
              >
                Create Specification
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Long Description</label>
                <input
                  className={inputClass}
                  value={specs.description}
                  onChange={e => setSpecs({ ...specs, description: e.target.value })}
                />
              </div>

              <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                <h4 className="text-blue-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                  <span>📦</span> Scale Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Scale Type</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.scaleType}
                      onChange={e => setSpecs({ ...specs, scaleType: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Integrator / Controller</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.integratorController}
                      onChange={e => setSpecs({ ...specs, integratorController: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Speed Sensor Type</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.speedSensorType}
                      onChange={e => setSpecs({ ...specs, speedSensorType: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Load Cell Brand</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.loadCellBrand}
                      onChange={e => setSpecs({ ...specs, loadCellBrand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Load Cell Size (e.g. 50kg)</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.loadCellSize}
                      onChange={e => setSpecs({ ...specs, loadCellSize: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">LC Sensitivity (mV/V)</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.loadCellSensitivity}
                      onChange={e => setSpecs({ ...specs, loadCellSensitivity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block">Number of Load Cells</label>
                    <input
                      type="number"
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.numberOfLoadCells}
                      onChange={e => setSpecs({ ...specs, numberOfLoadCells: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Roller Details Section */}
              <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                <h4 className="text-orange-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                  <span>🔧</span> Roller Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block">Roller Dimensions</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.rollDims}
                      onChange={e => setSpecs({ ...specs, rollDims: e.target.value })}
                      placeholder="e.g. 100mm x 50mm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block">Adjustment Type</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.adjustmentType}
                      onChange={e => setSpecs({ ...specs, adjustmentType: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Billet Details Section */}
              <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                <h4 className="text-purple-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                  <span>⚖️</span> Billet Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Billet Weight Type</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.billetWeightType}
                      onChange={e => setSpecs({ ...specs, billetWeightType: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Billet Weight Size</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.billetWeightSize}
                      onChange={e => setSpecs({ ...specs, billetWeightSize: e.target.value })}
                    />
                  </div>

                  {/* Dynamic Billet Weight IDs */}
                  <div className="col-span-2 border-t border-slate-700/50 pt-2 mt-1">
                    <label className="text-[10px] text-slate-400 block mb-1">Billet Weight IDs</label>
                    <div className="space-y-2">
                      {(specs.billetWeightIds || []).map((id, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                            placeholder={`ID #${index + 1}`}
                            value={id}
                            onChange={e => {
                              const newIds = [...(specs.billetWeightIds || [])];
                              newIds[index] = e.target.value;
                              setSpecs({ ...specs, billetWeightIds: newIds });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newIds = (specs.billetWeightIds || []).filter((_, i) => i !== index);
                              setSpecs({ ...specs, billetWeightIds: newIds });
                            }}
                            className="px-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                            title="Remove ID"
                          >
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSpecs({ ...specs, billetWeightIds: [...(specs.billetWeightIds || []), ''] })}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                      >
                        <Icons.Plus size={12} /> Add ID
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}

        </div>
        {/* --- ACTION BUTTONS (CONSOLIDATED) --- */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">

          {/* 1. Primary Save Button (FIX: Combines Asset and Spec saves) */}
          <Button
            onClick={() => {
              onSave(editingAsset, activeTab); // Save asset details
              if (specs) onSaveSpecs(specs); // Save specs if they exist
            }}
            className="flex-[2] justify-center"
          >
            Save All Changes
          </Button>

          {/* 2. Archive/Reactivate Button (Unchanged logic) */}
          <Button
            onClick={() => {
              const isArchiving = editingAsset.active !== false;
              const message = isArchiving
                ? 'Are you sure you want to archive this asset? It will be hidden from active lists but can be reactivated later.'
                : 'Are you sure you want to reactivate this asset?';

              if (window.confirm(message)) {
                setEditingAsset({ ...editingAsset, active: !isArchiving });
              }
            }}
            className={`flex-1 justify-center ${editingAsset.active !== false ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'}`}
          >
            {editingAsset.active !== false ? '📦 Archive' : '✅ Reactivate'}
          </Button>

          {/* NEW DOUBLE CONFIRM DELETE BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this asset?")) {
                if (window.confirm("Permanent Delete: This cannot be undone. Are you sure?")) {
                  onDelete(editingAsset);
                }
              }
            }}
            className="flex-1 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <Icons.Trash size={16} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const OperationalStatusModal = ({ isOpen, onClose, onSave, asset }) => {
  const [opStatus, setOpStatus] = React.useState(asset?.opStatus || 'Operational');
  const [opNote, setOpNote] = React.useState(asset?.opNote || '');

  if (!isOpen || !asset) return null;

  const handleSave = () => {
    onSave({
      opStatus,
      opNote,
      opNoteTimestamp: new Date().toISOString()
    });
    onClose();
  };

  const statusOptions = [
    { value: 'Operational', label: 'Operational', color: 'bg-green-600', hoverColor: 'hover:bg-green-700', borderColor: 'border-green-500' },
    { value: 'Warning', label: 'Warning', color: 'bg-yellow-600', hoverColor: 'hover:bg-yellow-700', borderColor: 'border-yellow-500' },
    { value: 'Down', label: 'Down/Critical', color: 'bg-red-600', hoverColor: 'hover:bg-red-700', borderColor: 'border-red-500' }
  ];

  return (
    <Modal title={`Operational Status: ${asset.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Status Selector */}
        <div>
          <label className={labelClass}>Current Status</label>
          <div className="grid grid-cols-1 gap-2">
            {statusOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOpStatus(option.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${opStatus === option.value
                  ? `${option.color} ${option.borderColor} text-white shadow-lg`
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${opStatus === option.value ? 'bg-slate-800' : option.color}`}></div>
                  <span className="font-bold">{option.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Notes */}
        <div>
          <label className={labelClass}>Status Notes</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-none`}
            placeholder="Add notes about the current operational status..."
            value={opNote}
            onChange={e => setOpNote(e.target.value)}
          />
          {asset.opNoteTimestamp && (
            <div className="text-xs text-slate-400 mt-1">
              Last updated: {new Date(asset.opNoteTimestamp).toLocaleString()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1 justify-center">
            Save Status
          </Button>
        </div>
      </div>
    </Modal>
  );
};
