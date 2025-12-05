import React, { useState } from 'react';
import { Modal, Button, UniversalDatePicker, SecureDeleteButton } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { validateSiteForm, sanitizeInput } from '../utils/validation';

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
  const [validationErrors, setValidationErrors] = useState({});

  const handleSave = () => {
    // Sanitize inputs
    const sanitizedForm = {
      ...siteForm,
      name: sanitizeInput(siteForm.name || ''),
      customer: sanitizeInput(siteForm.customer || ''),
      location: sanitizeInput(siteForm.location || ''),
      contactEmail: sanitizeInput(siteForm.contactEmail || ''),
      contactPhone1: sanitizeInput(siteForm.contactPhone1 || ''),
      contactPhone2: sanitizeInput(siteForm.contactPhone2 || ''),
      contactName: sanitizeInput(siteForm.contactName || ''),
      contactPosition: sanitizeInput(siteForm.contactPosition || ''),
      typeDetail: sanitizeInput(siteForm.typeDetail || '')
    };

    // Validate form
    const validation = validateSiteForm(sanitizedForm);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear errors and save
    setValidationErrors({});
    onSave(sanitizedForm, noteInput);
  };

  const getErrorClass = (field) => {
    return validationErrors[field] ? 'border-red-500' : '';
  };

  const getErrorMessage = (field) => {
    return validationErrors[field] ? (
      <span className="text-red-400 text-xs mt-1">{validationErrors[field]}</span>
    ) : null;
  };

  if (!isOpen) return null;

  return (
    <Modal title="Add New Site" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Site Name *</label>
            <input
              className={`${inputClass} ${getErrorClass('name')}`}
              placeholder="Site Name"
              value={siteForm.name || ''}
              onChange={e => setSiteForm({ ...siteForm, name: e.target.value })}
            />
            {getErrorMessage('name')}
          </div>
          <div>
            <label className={labelClass}>Customer *</label>
            <input
              className={`${inputClass} ${getErrorClass('customer')}`}
              placeholder="Customer Name"
              value={siteForm.customer || ''}
              onChange={e => setSiteForm({ ...siteForm, customer: e.target.value })}
            />
            {getErrorMessage('customer')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TypeSelect value={siteForm.type} onChange={e => setSiteForm({ ...siteForm, type: e.target.value })} />
          <div>
            <label className={labelClass}>Location *</label>
            <input
              className={`${inputClass} ${getErrorClass('location')}`}
              placeholder="Location"
              value={siteForm.location || ''}
              onChange={e => setSiteForm({ ...siteForm, location: e.target.value })}
            />
            {getErrorMessage('location')}
          </div>
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
          <div>
            <input
              className={`${inputClass} ${getErrorClass('contactEmail')}`}
              placeholder="Email"
              value={siteForm.contactEmail || ''}
              onChange={e => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
            />
            {getErrorMessage('contactEmail')}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <input
                className={`${inputClass} ${getErrorClass('contactPhone1')}`}
                placeholder="Phone 1"
                value={siteForm.contactPhone1 || ''}
                onChange={e => setSiteForm({ ...siteForm, contactPhone1: e.target.value })}
              />
              {getErrorMessage('contactPhone1')}
            </div>
            <div>
              <input
                className={`${inputClass} ${getErrorClass('contactPhone2')}`}
                placeholder="Phone 2"
                value={siteForm.contactPhone2 || ''}
                onChange={e => setSiteForm({ ...siteForm, contactPhone2: e.target.value })}
              />
              {getErrorMessage('contactPhone2')}
            </div>
          </div>
        </div>

        <div><label className={labelClass}>Logo</label><input type="file" accept="image/*" onChange={onLogoUpload} className="text-slate-400 text-xs" /></div>

        <div className={sectionClass}>
          <label className={labelClass}>Initial Note</label>
          <input className={`${inputClass} mb-2`} placeholder="Author" value={noteInput.author || ''} onChange={e => setNoteInput({ ...noteInput, author: e.target.value })} />
          <textarea className={inputClass} rows="2" placeholder="Content" value={noteInput.content || ''} onChange={e => setNoteInput({ ...noteInput, content: e.target.value })} />
        </div>
        <Button onClick={handleSave} className="w-full justify-center">Create Site</Button>
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
  onLogoUpload
}) => {
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

        {/* Task 3: Move Archive Customer Button to bottom */}
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded border border-slate-600">
            <div>
              <div className="text-sm font-bold text-slate-300">Customer Status</div>
              <div className="text-xs text-slate-400">
                {siteForm.active !== false ? 'Currently Active' : 'Currently Archived'}
              </div>
            </div>

            {/* ARCHIVE BUTTON WITH CONFIRMATION */}
            <button
              onClick={() => {
                const isArchiving = siteForm.active !== false;
                const message = isArchiving
                  ? "Are you sure you want to archive this customer?"
                  : "Are you sure you want to restore this customer?";

                if (window.confirm(message)) {
                  onToggleStatus(siteForm);
                }
              }}
              className={`px-3 py-1 text-xs font-bold rounded border ${siteForm.active !== false ? 'bg-slate-800 text-orange-400 border-orange-900 hover:bg-orange-900/20' : 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50'}`}
            >
              {siteForm.active !== false ? 'Archive Customer' : 'Restore Customer'}
            </button>
          </div>

          <div className="flex gap-2">
            {/* DOUBLE CONFIRMATION DELETE BUTTON */}
            <button
              onClick={() => {
                if (window.confirm(`WARNING: You are about to delete ${siteForm.name}.\n\nAre you sure?`)) {
                  if (window.confirm("This action cannot be undone.\n\nPress OK to permanently delete this site and all its data.")) {
                    onDelete(siteForm.id);
                    onClose(); // <--- ADD THIS to close the modal
                  }
                }
              }}
              className="flex-1 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30 px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
            >
              <Icons.Trash size={16} /> Delete Site
            </button>

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

// ==========================================
// SITE NOTES MODAL - Full notes management
// ==========================================
export const SiteNotesModal = ({
  isOpen,
  onClose,
  site,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first

  if (!isOpen || !site) return null;

  const notes = site.notes || [];

  // Filter and sort notes
  const filteredNotes = notes
    .filter(note => showArchived || !note.archived)
    .sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const activeNotesCount = notes.filter(n => !n.archived).length;
  const archivedNotesCount = notes.filter(n => n.archived).length;

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    onAddNote(site.id, {
      id: `note-${Date.now()}`,
      content: newNoteContent.trim(),
      author: newNoteAuthor.trim() || 'Unknown',
      timestamp: new Date().toISOString(),
      archived: false
    });

    setNewNoteContent('');
    setNewNoteAuthor('');
  };

  const handleStartEdit = (note) => {
    setEditingNote(note);
    setEditContent(note.content);
    setEditAuthor(note.author);
  };

  const handleSaveEdit = () => {
    if (!editingNote || !editContent.trim()) return;

    onUpdateNote(site.id, editingNote.id, {
      content: editContent.trim(),
      author: editAuthor.trim() || editingNote.author,
      timestamp: new Date().toISOString() // Update timestamp on edit
    });

    setEditingNote(null);
    setEditContent('');
    setEditAuthor('');
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
    setEditAuthor('');
  };

  const handleDelete = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      onDeleteNote(site.id, noteId);
    }
  };

  const handleArchive = (noteId, isArchived) => {
    onArchiveNote(site.id, noteId, !isArchived);
  };

  return (
    <Modal title={`Notes: ${site.customer || site.name}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{activeNotesCount}</div>
              <div className="text-[10px] text-slate-400 uppercase">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-500">{archivedNotesCount}</div>
              <div className="text-[10px] text-slate-400 uppercase">Archived</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title={sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            >
              {sortOrder === 'desc' ? <Icons.SortDesc size={16} /> : <Icons.SortAsc size={16} />}
            </button>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${showArchived
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* Add New Note */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
            <Icons.Plus size={14} /> Add New Note
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Author name..."
              value={newNoteAuthor}
              onChange={(e) => setNewNoteAuthor(e.target.value)}
              className={inputClass}
            />
            <textarea
              placeholder="Write your note here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim()}
              className="w-full justify-center"
            >
              <Icons.Plus size={16} /> Add Note
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Icons.FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes found</p>
              {!showArchived && archivedNotesCount > 0 && (
                <p className="text-xs mt-1">({archivedNotesCount} archived notes hidden)</p>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border transition-all ${note.archived
                  ? 'bg-slate-900/30 border-slate-800 opacity-60'
                  : 'bg-slate-800 border-slate-700'
                  } ${editingNote?.id === note.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                {editingNote?.id === note.id ? (
                  // Edit Mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className={`${inputClass} text-xs`}
                      placeholder="Author"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none text-sm`}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} className="flex-1 justify-center text-xs py-1">
                        <Icons.Check size={14} /> Save
                      </Button>
                      <Button onClick={handleCancelEdit} variant="secondary" className="flex-1 justify-center text-xs py-1">
                        <Icons.X size={14} /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-300">👤 {note.author}</span>
                        {note.archived && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-400 rounded">Archived</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{formatDate(note.timestamp, true)}</span>
                    </div>
                    <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap">{note.content}</p>

                    {/* Action Buttons */}
                    <div className="flex gap-1 pt-2 border-t border-slate-700">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                      >
                        <Icons.Edit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleArchive(note.id, note.archived)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs rounded transition-colors ${note.archived
                          ? 'text-green-400 hover:bg-green-900/30'
                          : 'text-orange-400 hover:bg-orange-900/30'
                          }`}
                      >
                        {note.archived ? <><Icons.RotateCcw size={12} /> Restore</> : <><Icons.Archive size={12} /> Archive</>}
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      >
                        <Icons.Trash size={12} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-700">
          <Button onClick={onClose} variant="secondary" className="w-full justify-center">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};