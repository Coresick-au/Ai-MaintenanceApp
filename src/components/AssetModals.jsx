import React from 'react';
import { Modal, Button, LongPressButton } from './UIComponents';

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
          <input
            type="date"
            className={inputClass}
            value={newAsset.lastCal}
            onChange={e => setNewAsset({ ...newAsset, lastCal: e.target.value })}
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
  const [activeEditTab, setActiveEditTab] = React.useState('asset');

  if (!isOpen || !editingAsset) return null;

  return (
    <Modal title="Edit Asset & Specifications" onClose={onClose}>
      {/* Tab Navigation */}
      <div className="flex bg-slate-700/30 p-1 rounded-lg border border-slate-600 mb-4">
        <button
          onClick={() => setActiveEditTab('asset')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${activeEditTab === 'asset'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
        >
          Asset Details
        </button>
        <button
          onClick={() => setActiveEditTab('specs')}
          className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${activeEditTab === 'specs'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
        >
          Specifications
        </button>
      </div>

      {/* Asset Details Tab */}
      {activeEditTab === 'asset' && (
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
              <label className={labelClass}>Code</label>
              <input
                className={inputClass}
                placeholder="Code"
                value={editingAsset.code}
                onChange={e => setEditingAsset({ ...editingAsset, code: e.target.value })}
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded border border-slate-600">
            <div>
              <div className="text-sm font-bold text-slate-300">Asset Status</div>
              <div className="text-xs text-slate-400">
                {editingAsset.active !== false ? 'Currently Active' : 'Currently Decommissioned'}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const isActivating = editingAsset.active === false;
                const confirmMsg = isActivating
                  ? "Re-activate this asset? It will appear in schedules and stats again."
                  : "Decommission this asset? It will be hidden from schedules and stats.";

                if (!window.confirm(confirmMsg)) return;

                setEditingAsset({ ...editingAsset, active: isActivating });
              }}
              className={`px-3 py-1 text-xs font-bold rounded border ${editingAsset.active !== false ? 'bg-slate-800 text-orange-400 border-orange-900 hover:bg-orange-900/20' : 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'}`}
            >
              {editingAsset.active !== false ? 'Archive / Decommission' : 'Re-activate Asset'}
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <LongPressButton onComplete={onDelete} label="Hold to Delete" />
            <Button onClick={() => onSave(editingAsset, activeTab)} className="flex-[2] justify-center">Update Asset</Button>
          </div>
        </div>
      )}

      {/* Specifications Tab */}
      {activeEditTab === 'specs' && (
        <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Weigher Name</label>
                  <input
                    className={inputClass}
                    value={specs.weigher}
                    onChange={e => setSpecs({ ...specs, weigher: e.target.value })}
                    placeholder="e.g. W1"
                  />
                </div>
                <div>
                  <label className={labelClass}>Alt/Link Code</label>
                  <input
                    className={inputClass}
                    value={specs.altCode}
                    onChange={e => setSpecs({ ...specs, altCode: e.target.value })}
                    placeholder="Matches Asset Code"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input
                  className={inputClass}
                  value={specs.description}
                  onChange={e => setSpecs({ ...specs, description: e.target.value })}
                />
              </div>

              <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                <h4 className="text-blue-400 text-sm font-bold uppercase mb-3">Scale Details</h4>
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

              <div className="p-4 bg-slate-900/50 rounded border border-slate-700">
                <h4 className="text-orange-400 text-sm font-bold uppercase mb-3">Roller & Billet</h4>
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
                  <div>
                    <label className="text-[10px] text-slate-400 block">Adjustment Type</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white"
                      value={specs.adjustmentType}
                      onChange={e => setSpecs({ ...specs, adjustmentType: e.target.value })}
                    />
                  </div>
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
                </div>
              </div>

              <Button onClick={onSaveSpecs} className="w-full justify-center">
                Save Specifications
              </Button>
            </>
          )}
        </div>
      )}
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
