# Archived: Add Site Modal - December 12, 2025

## Reason for Archival

The "Add New Site" modal functionality has been superseded by the Customer Portal's "Managed Sites" feature. All functionality previously provided by this modal is now available through the Customer Portal with better integration and user experience.

## What Was Archived

### 1. AddSiteModal Component
**File**: `SiteModals.jsx` (lines 48-272)

**Features**:
- Site name input
- Customer selection dropdown
- Quick Add Customer inline functionality
- Site type selection (Mine, Quarry, Port, Plant, Other)
- Location input
- Main contact details (name, position, email, phone 1, phone 2)
- Photo folder link input
- Logo upload
- Initial note creation (author + content)
- Form validation and error handling

### 2. Related State and Handlers in App.jsx

**State Variables**:
```javascript
const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
const [siteForm, setSiteForm] = useState({
  name: '',
  customer: '',
  customerId: '',
  location: '',
  type: 'Mine',
  contactName: '',
  contactPosition: '',
  contactEmail: '',
  contactPhone1: '',
  contactPhone2: '',
  photoFolderLink: '',
  logo: null
});
const [noteInput, setNoteInput] = useState({ author: '', content: '' });
```

**Handler Functions**:
- `handleAddSite()` - Main site creation handler
- Logo upload handler
- Form reset logic

### 3. UI Elements

**Buttons/Triggers**:
- "Add Site" button in dashboard header
- Modal open/close handlers

---

## Full Component Code

\`\`\`jsx
${`import React, { useState } from 'react';
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { validateSiteForm, sanitizeInput } from '../utils/validation';
import { useGlobalData } from '../context/GlobalDataContext';

// CSS class constants
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
  const { customers, addCustomer } = useGlobalData();
  const [validationErrors, setValidationErrors] = useState({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');

  const handleSave = () => {
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

    const validation = validateSiteForm(sanitizedForm);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

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
              className={\`\${inputClass} \${getErrorClass('name')}\`}
              placeholder="Site Name"
              value={siteForm.name || ''}
              onChange={e => setSiteForm({ ...siteForm, name: e.target.value })}
            />
            {getErrorMessage('name')}
          </div>
          <div>
            <label className={labelClass}>Customer *</label>
            <div className="flex gap-2">
              <select
                className={\`flex-1 \${inputClass} \${getErrorClass('customer')}\`}
                value={siteForm.customerId || ''}
                onChange={e => {
                  const customerId = e.target.value;
                  const customer = customers.find(c => c.id === customerId);
                  setSiteForm({
                    ...siteForm,
                    customerId: customerId,
                    customer: customer ? customer.name : ''
                  });
                }}
              >
                <option value="">Select Customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold transition flex items-center gap-1"
                title="Quick Add Customer"
              >
                <Icons.Plus size={14} /> Quick Add
              </button>
            </div>
            {showQuickAdd && (
              <div className="mt-2 p-3 bg-slate-800/50 rounded border border-purple-500/30">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="New customer name..."
                    value={quickAddName}
                    onChange={e => setQuickAddName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (quickAddName.trim()) {
                          const newId = await addCustomer({ name: quickAddName.trim() });
                          if (newId) {
                            setSiteForm({ ...siteForm, customerId: newId, customer: quickAddName.trim() });
                            setQuickAddName('');
                            setShowQuickAdd(false);
                          }
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (quickAddName.trim()) {
                        const newId = await addCustomer({ name: quickAddName.trim() });
                        if (newId) {
                          setSiteForm({ ...siteForm, customerId: newId, customer: quickAddName.trim() });
                          setQuickAddName('');
                          setShowQuickAdd(false);
                        }
                      }
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            {getErrorMessage('customer')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TypeSelect value={siteForm.type} onChange={e => setSiteForm({ ...siteForm, type: e.target.value })} />
          <div>
            <label className={labelClass}>Location *</label>
            <input
              className={\`\${inputClass} \${getErrorClass('location')}\`}
              placeholder="Location"
              value={siteForm.location || ''}
              onChange={e => setSiteForm({ ...siteForm, location: e.target.value })}
            />
            {getErrorMessage('location')}
          </div>
        </div>

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
              className={\`\${inputClass} \${getErrorClass('contactEmail')}\`}
              placeholder="Email"
              value={siteForm.contactEmail || ''}
              onChange={e => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
            />
            {getErrorMessage('contactEmail')}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <input
                className={\`\${inputClass} \${getErrorClass('contactPhone1')}\`}
                placeholder="Phone 1"
                value={siteForm.contactPhone1 || ''}
                onChange={e => setSiteForm({ ...siteForm, contactPhone1: e.target.value })}
              />
              {getErrorMessage('contactPhone1')}
            </div>
            <div>
              <input
                className={\`\${inputClass} \${getErrorClass('contactPhone2')}\`}
                placeholder="Phone 2"
                value={siteForm.contactPhone2 || ''}
                onChange={e => setSiteForm({ ...siteForm, contactPhone2: e.target.value })}
              />
              {getErrorMessage('contactPhone2')}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <label className={labelClass}>Photo Folder Link</label>
          <input className={\`\${inputClass} mb-2\`} placeholder="https://onedrive..." value={siteForm.photoFolderLink || ''} onChange={e => setSiteForm({ ...siteForm, photoFolderLink: e.target.value })} />
        </div>

        <div><label className={labelClass}>Logo</label><input type="file" accept="image/*" onChange={onLogoUpload} className="text-slate-400 text-xs" /></div>

        <div className={sectionClass}>
          <label className={labelClass}>Initial Note</label>
          <input className={\`\${inputClass} mb-2\`} placeholder="Author" value={noteInput.author || ''} onChange={e => setNoteInput({ ...noteInput, author: e.target.value })} />
          <textarea className={inputClass} rows="2" placeholder="Content" value={noteInput.content || ''} onChange={e => setNoteInput({ ...noteInput, content: e.target.value })} />
        </div>
        <Button onClick={handleSave} className="w-full justify-center">Create Site</Button>
      </div>
    </Modal>
  );
};`}
\`\`\`

---

## Migration Path

All functionality has been moved to the Customer Portal:

1. **Site Creation** → Customer Portal > Managed Sites > Add Site
2. **Customer Selection** → Integrated with customer management
3. **Quick Add Customer** → Customer Portal > Add Customer
4. **Site Details** → Customer Portal > Site Details
5. **Contact Management** → Customer Portal > Contacts
6. **Notes** → Customer Portal > Customer Notes

---

## Restoration Instructions

If this functionality needs to be restored:

1. Copy the component code from this archive
2. Restore to `src/components/SiteModals.jsx`
3. Add back the state and handlers in `App.jsx`
4. Add back the "Add Site" button in the dashboard
5. Import and use the modal component

---

## Related Files

- `src/components/SiteModals.jsx` - Component definition
- `src/App.jsx` - State and handlers
- `src/utils/validation.js` - Form validation logic
- `src/context/GlobalDataContext.jsx` - Customer data integration

---

**Archived by**: Antigravity AI Assistant  
**Date**: December 12, 2025  
**Reason**: Superseded by Customer Portal functionality
