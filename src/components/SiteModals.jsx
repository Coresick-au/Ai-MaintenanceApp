import React, { useState } from 'react';
import { Modal, Button, UniversalDatePicker } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';

// CSS class constants for form styling
const labelClass = "block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider";
const inputClass = "w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white focus:outline-none focus:border-blue-500";
const sectionClass = "p-3 bg-slate-800/50 rounded border border-slate-700";

const TypeSelect = ({ value, onChange }) => (
  <div>
    <label className={labelClass}>Site Type</label>
    <select
      value={value || 'Mine'}
      onChange={onChange}
      className="w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white focus:outline-none focus:border-blue-500"
    >
      <option value="Mine">Mine</option>
      <option value="Quarry">Quarry</option>
      <option value="Port">Port</option>
      <option value="Plant">Processing Plant</option>
      <option value="Other">Custom / Other</option>
    </select>
  </div>
);

export const AddSiteModal = ({
  isOpen,
  onClose,
  onSave,
  siteForm,
  setSiteForm,
  noteInput,
  setNoteInput,
  onLogoUpload
}) => {
  if (!isOpen) return null;

  return (
    <Modal title="Add New Site" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Site Name</label><input className={inputClass} placeholder="Site Name" value={siteForm.name || ''} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} /></div>
          <div><label className={labelClass}>Customer</label><input className={inputClass} placeholder="Customer Name" value={siteForm.customer || ''} onChange={e => setSiteForm({ ...siteForm, customer: e.target.value })} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TypeSelect value={siteForm.type} onChange={e => setSiteForm({ ...siteForm, type: e.target.value })} />
          <div><label className={labelClass}>Location</label><input className={inputClass} placeholder="Location" value={siteForm.location || ''} onChange={e => setSiteForm({ ...siteForm, location: e.target.value })} /></div>
        </div>

        {/* Task 1: Conditional Custom Input */}
        {(siteForm.type === 'Other' || siteForm.type === 'Custom') && (
          <div>
            <label className={labelClass}>Custom Site Type</label>
            <input
              className={inputClass}
              placeholder="Specify Site Type"
              value={siteForm.typeDetail || ''}
              onChange={e => setSiteForm({ ...siteForm, typeDetail: e.target.value })}
            />
          </div>
        )}

        <div className={sectionClass}>
          <h4 className="text-xs font-bold uppercase text-blue-400 mb-2">Main Contact</h4>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="Contact Name" value={siteForm.contactName || ''} onChange={e => setSiteForm({ ...siteForm, contactName: e.target.value })} />
            <input className={inputClass} placeholder="Position" value={siteForm.contactPosition || ''} onChange={e => setSiteForm({ ...siteForm, contactPosition: e.target.value })} />
          </div>
          <input className={inputClass} placeholder="Email" value={siteForm.contactEmail || ''} onChange={e => setSiteForm({ ...siteForm, contactEmail: e.target.value })} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input className={inputClass} placeholder="Phone 1" value={siteForm.contactPhone1 || ''} onChange={e => setSiteForm({ ...siteForm, contactPhone1: e.target.value })} />
            <input className={inputClass} placeholder="Phone 2" value={siteForm.contactPhone2 || ''} onChange={e => setSiteForm({ ...siteForm, contactPhone2: e.target.value })} />
          </div>
        </div>

        <div><label className={labelClass}>Logo</label><input type="file" accept="image/*" onChange={onLogoUpload} className="text-slate-400 text-xs" /></div>

        <div className={sectionClass}>
          <label className={labelClass}>Initial Note</label>
          <input className={`${inputClass} mb-2`} placeholder="Author" value={noteInput.author || ''} onChange={e => setNoteInput({ ...noteInput, author: e.target.value })} />
          <textarea className={inputClass} rows="2" placeholder="Content" value={noteInput.content || ''} onChange={e => setNoteInput({ ...noteInput, content: e.target.value })} />
        </div>
        <Button onClick={() => onSave(siteForm, noteInput)} className="w-full justify-center">Create Site</Button>
      </div>
    </Modal>
  );
};

export const EditSiteModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onToggleStatus,
  siteForm,
  setSiteForm,
  noteInput,
  setNoteInput,
  onLogoUpload,
  onAddNote
}) => {
  const [showNotes, setShowNotes] = useState(false); // Task 2: Local state for notes toggle

  if (!isOpen) return null;

  return (
    <Modal title="Edit Site Details" onClose={onClose}>
      <div className="space-y-4">
        <div className={sectionClass}>
          <h4 className="text-xs font-bold uppercase text-blue-400">General Info</h4>
          <div><label className={labelClass}>Logo</label><input type="file" accept="image/*" onChange={onLogoUpload} className="text-slate-400 text-xs" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Customer</label><input className={inputClass} placeholder="Customer" value={siteForm.customer || ''} onChange={e => setSiteForm({ ...siteForm, customer: e.target.value })} /></div>
            <div><label className={labelClass}>Name</label><input className={inputClass} placeholder="Name" value={siteForm.name || ''} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TypeSelect value={siteForm.type} onChange={e => setSiteForm({ ...siteForm, type: e.target.value })} />
            <div><label className={labelClass}>Location</label><input className={inputClass} placeholder="Location" value={siteForm.location || ''} onChange={e => setSiteForm({ ...siteForm, location: e.target.value })} /></div>
          </div>

          {/* Task 1: Conditional Custom Input */}
          {(siteForm.type === 'Other' || siteForm.type === 'Custom') && (
            <div>
              <label className={labelClass}>Custom Site Type</label>
              <input
                className={inputClass}
                placeholder="Specify Site Type"
                value={siteForm.typeDetail || ''}
                onChange={e => setSiteForm({ ...siteForm, typeDetail: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className={sectionClass}>
          <h4 className="text-xs font-bold uppercase text-blue-400 mb-2">Main Contact</h4>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="Contact Name" value={siteForm.contactName || ''} onChange={e => setSiteForm({ ...siteForm, contactName: e.target.value })} />
            <input className={inputClass} placeholder="Position" value={siteForm.contactPosition || ''} onChange={e => setSiteForm({ ...siteForm, contactPosition: e.target.value })} />
          </div>
          <input className={`${inputClass} mt-2`} placeholder="Email" value={siteForm.contactEmail || ''} onChange={e => setSiteForm({ ...siteForm, contactEmail: e.target.value })} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input className={inputClass} placeholder="Phone 1" value={siteForm.contactPhone1 || ''} onChange={e => setSiteForm({ ...siteForm, contactPhone1: e.target.value })} />
            <input className={inputClass} placeholder="Phone 2" value={siteForm.contactPhone2 || ''} onChange={e => setSiteForm({ ...siteForm, contactPhone2: e.target.value })} />
          </div>
        </div>

        {/* Task 2: Hide Notes Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className={labelClass}>Notes History</h4>
            <Button
              onClick={() => setShowNotes(!showNotes)}
              variant="secondary"
              className="text-xs py-1 px-2 h-auto"
            >
              {showNotes ? 'Hide Notes' : 'Show Notes'}
            </Button>
          </div>

          {showNotes && (
            <>
              <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-600 p-2 rounded bg-slate-900/50">
                {(siteForm.notes || []).map(note => (
                  <div key={note.id} className="p-2 border border-slate-700 rounded text-sm bg-slate-800">
                    <div className="flex justify-between"><span className="font-bold text-xs text-slate-300">👤 {note.author}</span><span className="text-[10px] text-slate-400">{formatDate(note.timestamp, true)}</span></div>
                    <p className="text-slate-300 mt-1">{note.content}</p>
                  </div>
                ))}
                {(!siteForm.notes || siteForm.notes.length === 0) && <p className="text-slate-400 text-xs italic text-center">No notes found.</p>}
              </div>
              <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700">
                <input className={`${inputClass} mb-2 text-xs`} placeholder="New Note Author" value={noteInput.author || ''} onChange={e => setNoteInput({ ...noteInput, author: e.target.value })} />
                <div className="flex gap-2">
                  <input className={`${inputClass} text-xs`} placeholder="New Note Content" value={noteInput.content || ''} onChange={e => setNoteInput({ ...noteInput, content: e.target.value })} />
                  <button onClick={onAddNote} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-500 transition-colors">Add</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Task 3: Move Archive Customer Button to bottom */}
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded border border-slate-600">
            <div>
              <div className="text-sm font-bold text-slate-300">Customer Status</div>
              <div className="text-xs text-slate-400">
                {siteForm.active !== false ? 'Currently Active' : 'Currently Archived'}
              </div>
            </div>
            <button
              onClick={() => onToggleStatus(siteForm)}
              className={`px-3 py-1 text-xs font-bold rounded border ${siteForm.active !== false ? 'bg-slate-800 text-orange-400 border-orange-900 hover:bg-orange-900/20' : 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'}`}
            >
              {siteForm.active !== false ? 'Archive Customer' : 'Restore Customer'}
            </button>
          </div>

          <div className="flex gap-2">
            <SecureDeleteButton onComplete={() => onDelete(siteForm.id)} label="Hold to Delete Site" />
            <Button onClick={() => onSave(siteForm)} className="flex-[2] justify-center">Save Changes</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const ContactModal = ({ site, onClose }) => {
  if (!site) return null;

  return (
    <Modal title="Contact Details" onClose={onClose}>
      <div className="space-y-6 text-slate-300">
        <div className="text-center border-b border-slate-700 pb-4">
          <h3 className="text-xl font-bold text-white">{site.contactName || 'No Contact Name'}</h3>
          <p className="text-slate-400">{site.contactPosition || 'No Position Listed'}</p>
          <p className="text-sm text-blue-400 font-medium mt-1">{site.customer}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="bg-slate-800 p-2 rounded-full shadow-sm text-blue-400"><Icons.Mail /></div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold">Email</div>
              <div className="text-slate-200 font-medium">{site.contactEmail || 'N/A'}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="bg-slate-800 p-2 rounded-full shadow-sm text-green-400"><Icons.Phone /></div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold">Phone 1</div>
              <div className="text-slate-200 font-medium">{site.contactPhone1 || 'N/A'}</div>
            </div>
          </div>

          {site.contactPhone2 && (
            <div className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="bg-slate-800 p-2 rounded-full shadow-sm text-green-400"><Icons.Phone /></div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">Phone 2</div>
                <div className="text-slate-200 font-medium">{site.contactPhone2}</div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button onClick={onClose} className="w-full justify-center" variant="secondary">Close</Button>
        </div>
      </div>
    </Modal>
  );
};