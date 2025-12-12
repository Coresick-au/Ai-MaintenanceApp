import React, { useState } from 'react';
import { Modal, Button, UniversalDatePicker, SecureDeleteButton } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { validateSiteForm, sanitizeInput } from '../utils/validation';
import { useGlobalData } from '../context/GlobalDataContext';

// Helper function to format full location string
const formatFullLocation = (siteForm) => {
  const parts = [];

  if (siteForm.streetAddress) parts.push(siteForm.streetAddress);
  if (siteForm.city) parts.push(siteForm.city);
  if (siteForm.state) parts.push(siteForm.state);
  if (siteForm.postcode) parts.push(siteForm.postcode);
  if (siteForm.country && siteForm.country !== 'Australia') parts.push(siteForm.country);

  // If no detailed address, fallback to location name
  if (parts.length === 0 && siteForm.location) {
    return siteForm.location;
  }

  return parts.join(', ') || 'Location will appear here...';
};

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

// ==========================================
// ARCHIVED: AddSiteModal
// ==========================================
// The AddSiteModal component has been archived to:
// src/_archive/deprecated-2025-12-12/AddSiteModal-ARCHIVED.md
//
// Reason: Functionality superseded by Customer Portal's "Managed Sites" feature
// All site creation is now handled through the Customer Portal
// ==========================================

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
            <div>
              <label className={labelClass}>Location Name</label>
              <input
                className={inputClass}
                placeholder="e.g., Townsville Plant"
                value={siteForm.location || ''}
                onChange={e => {
                  const newLocation = e.target.value;
                  setSiteForm({
                    ...siteForm,
                    location: newLocation,
                    // Update full location string when location name changes
                    fullLocation: formatFullLocation({
                      ...siteForm,
                      location: newLocation
                    })
                  });
                }}
              />
              <p className="text-xs text-slate-500 mt-1">Primary location name (displayed in reports)</p>
            </div>
          </div>

          {/* Enhanced Location Details */}
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h4 className="text-xs font-bold uppercase text-blue-400 mb-3">Detailed Address Information</h4>

            <div className="grid grid-cols-1 gap-4">
              {/* Street Address */}
              <div>
                <label className={labelClass}>Street Address</label>
                <input
                  className={inputClass}
                  placeholder="123 Main Street"
                  value={siteForm.streetAddress || ''}
                  onChange={e => {
                    setSiteForm({
                      ...siteForm,
                      streetAddress: e.target.value,
                      fullLocation: formatFullLocation({
                        ...siteForm,
                        streetAddress: e.target.value
                      })
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className={labelClass}>City/Suburb</label>
                  <input
                    className={inputClass}
                    placeholder="Townsville"
                    value={siteForm.city || ''}
                    onChange={e => {
                      setSiteForm({
                        ...siteForm,
                        city: e.target.value,
                        fullLocation: formatFullLocation({
                          ...siteForm,
                          city: e.target.value
                        })
                      });
                    }}
                  />
                </div>

                {/* State */}
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    className={`${inputClass} cursor-pointer`}
                    value={siteForm.state || ''}
                    onChange={e => {
                      setSiteForm({
                        ...siteForm,
                        state: e.target.value,
                        fullLocation: formatFullLocation({
                          ...siteForm,
                          state: e.target.value
                        })
                      });
                    }}
                  >
                    <option value="">Select State</option>
                    <option value="QLD">Queensland</option>
                    <option value="NSW">New South Wales</option>
                    <option value="VIC">Victoria</option>
                    <option value="WA">Western Australia</option>
                    <option value="SA">South Australia</option>
                    <option value="TAS">Tasmania</option>
                    <option value="ACT">Australian Capital Territory</option>
                    <option value="NT">Northern Territory</option>
                  </select>
                </div>

                {/* Postcode */}
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input
                    className={inputClass}
                    placeholder="4810"
                    value={siteForm.postcode || ''}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSiteForm({
                        ...siteForm,
                        postcode: value,
                        fullLocation: formatFullLocation({
                          ...siteForm,
                          postcode: value
                        })
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Country */}
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    className={inputClass}
                    placeholder="Australia"
                    value={siteForm.country || 'Australia'}
                    onChange={e => {
                      setSiteForm({
                        ...siteForm,
                        country: e.target.value,
                        fullLocation: formatFullLocation({
                          ...siteForm,
                          country: e.target.value
                        })
                      });
                    }}
                  />
                </div>

                {/* Google Maps Link */}
                <div>
                  <label className={labelClass}>Google Maps Link</label>
                  <input
                    className={inputClass}
                    placeholder="-19.2590, 146.8169"
                    value={siteForm.gpsCoordinates || ''}
                    onChange={e => setSiteForm({ ...siteForm, gpsCoordinates: e.target.value })}
                  />
                  {siteForm.gpsCoordinates && (
                    <div className="mt-2">
                      <a
                        href={`https://www.google.com/maps?q=${siteForm.gpsCoordinates}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                      >
                        <Icons.MapPin size={12} />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Latitude, Longitude</p>
                </div>

                {/* Photo Folder Link */}
                <div className="span-col-2">
                  <label className={labelClass}>Photo Folder Link (OneDrive)</label>
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={siteForm.photoFolderLink || ''}
                    onChange={e => setSiteForm({ ...siteForm, photoFolderLink: e.target.value })}
                  />
                  {siteForm.photoFolderLink && (
                    <div className="mt-2">
                      <a
                        href={siteForm.photoFolderLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                      >
                        <Icons.Folder size={12} />
                        Open Folder
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Display Full Formatted Location */}
              <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-600">
                <p className="text-xs text-slate-400 mb-1">Formatted Location:</p>
                <p className="text-sm text-slate-200 font-medium">
                  {formatFullLocation(siteForm) || 'Location will appear here...'}
                </p>
              </div>
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

        <Button onClick={() => onSave(siteForm)} className="w-full justify-center">Save Changes</Button>
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

    onAddNote(site.id, newNoteContent.trim(), newNoteAuthor.trim() || 'Unknown');

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

    onUpdateNote(site.id, editingNote.id, editContent.trim());

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
    onArchiveNote(site.id, noteId, isArchived);
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
                className={`group rounded-lg border transition-all ${note.archived
                  ? 'bg-slate-900/30 border-slate-800 opacity-60'
                  : 'bg-slate-700/50 border-slate-600 hover:border-blue-500/50'
                  } p-3`}
              >
                {editingNote?.id === note.id ? (
                  // EDITING STATE (Refined buttons for Archive/Delete)
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-blue-400 text-xs uppercase tracking-wide">Editing Note...</span>
                    </div>
                    <input
                      className="w-full border border-slate-600 rounded p-2 text-sm mb-1 bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      placeholder="Author Name"
                    />
                    <textarea
                      className="w-full border border-slate-600 rounded p-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows="3"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-600 items-center">
                      {/* Icon-only Archive/Delete for editing state */}
                      <button
                        onClick={() => handleArchive(note.id, note.archived)}
                        className={`p-1.5 rounded hover:bg-slate-600 transition-colors ${note.archived ? 'text-green-400' : 'text-amber-400'}`}
                        title={note.archived ? "Restore Note" : "Archive Note"}
                      >
                        {note.archived ? <Icons.RotateCcw size={16} /> : <Icons.Archive size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 rounded text-red-400 hover:bg-slate-600 hover:text-red-300 transition-colors"
                        title="Delete Note"
                      >
                        <Icons.Trash size={16} />
                      </button>

                      <div className="w-px h-4 bg-slate-600 mx-1"></div>

                      {/* Text buttons for primary actions */}
                      <button onClick={handleCancelEdit} className="bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-500 font-bold transition-colors flex items-center gap-1">
                        <Icons.X size={14} /> Cancel
                      </button>
                      <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500 font-bold transition-colors flex items-center gap-1">
                        <Icons.Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // DISPLAY STATE (Refined: Clickable content, hover buttons)
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleStartEdit(note)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStartEdit(note);
                      }
                    }}
                    className="w-full text-left space-y-2 p-0 relative focus:outline-none rounded-lg group-hover:scale-[1.005] transition-transform duration-200 cursor-pointer"
                    title="Click to edit note"
                  >
                    <div className="flex justify-between items-start mb-1 relative pr-16">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide border border-slate-700/50">👤 {note.author || 'UNKNOWN'}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          {formatDate(note.timestamp, true)}
                        </span>
                        {note.archived && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-orange-400 rounded border border-orange-900/30">Archived</span>
                        )}
                      </div>

                      {/* Floating Icon-Only Action Buttons (Visible on group-hover) */}
                      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 bg-slate-800 rounded-lg shadow-lg border border-slate-600 p-1 scale-90 group-hover:scale-100">
                        {/* Edit Visual Cue */}
                        <span className="p-1.5 rounded text-blue-400 hover:bg-slate-700" title="Edit Note">
                          <Icons.Edit size={14} />
                        </span>

                        <div className="w-px h-4 bg-slate-700 my-auto mx-0.5"></div>

                        {/* Archive Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleArchive(note.id, note.archived); }}
                          className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${note.archived ? 'text-green-400' : 'text-amber-400'}`}
                          title={note.archived ? "Restore Note" : "Archive Note"}
                        >
                          {note.archived ? <Icons.RotateCcw size={14} /> : <Icons.Archive size={14} />}
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                          className="p-1.5 rounded text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                          title="Delete Note"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    <p className={`text-sm text-slate-300 whitespace-pre-wrap leading-relaxed ${note.archived ? 'line-through opacity-70' : ''}`}>
                      {typeof note.content === 'string' ? note.content : (note.content?.content || 'Error: Invalid Note Data')}
                    </p>
                  </div>
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