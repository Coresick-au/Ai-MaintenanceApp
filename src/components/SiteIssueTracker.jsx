import React, { useState } from 'react';
import { Button, Modal, StatusBadge, UniversalDatePicker } from './UIComponents';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';

export const SiteIssueTracker = ({ issues = [], siteId, assets, onAddIssue, onToggleStatus, onUpdateIssue, onCopyIssue }) => {
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newIssueAssignedTo, setNewIssueAssignedTo] = useState('');
  const [newIssueImportance, setNewIssueImportance] = useState('Medium');
  const [newIssueAssetId, setNewIssueAssetId] = useState('');
  const [newIssueDueDate, setNewIssueDueDate] = useState(null);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [sortIssuesConfig, setSortIssuesConfig] = useState({ key: 'createdAt', direction: 'descending' });
  const [showCompletedIssues, setShowCompletedIssues] = useState(true);

  // States for Edit Issue Modal form fields
  const [editIssueDescription, setEditIssueDescription] = useState('');
  const [editIssueAssignedTo, setEditIssueAssignedTo] = useState('');
  const [editIssueImportance, setEditIssueImportance] = useState('Medium');
  const [editIssueAssetId, setEditIssueAssetId] = useState('');
  const [editIssueDueDate, setEditIssueDueDate] = useState(null);

  const handleAddIssue = () => {
    if (newIssueDescription.trim() === '') return;

    const selectedAsset = assets ? assets.find(asset => asset.id === newIssueAssetId) : null;
    const newIssueAssetName = selectedAsset ? selectedAsset.name : null;

    onAddIssue(siteId, {
      id: `issue-${Date.now()}`,
      description: newIssueDescription.trim(),
      status: 'Open',
      assignedTo: newIssueAssignedTo.trim() || 'Unassigned',
      createdAt: new Date().toISOString(),
      completedAt: null,
      importance: newIssueImportance,
      assetId: newIssueAssetId || null,
      assetName: newIssueAssetName,
      dueDate: newIssueDueDate ? newIssueDueDate.toISOString().split('T')[0] : null,
    });
    setNewIssueDescription('');
    setNewIssueAssignedTo('');
    setNewIssueImportance('Medium');
    setNewIssueAssetId('');
    setNewIssueDueDate(null);
    setShowAddIssueModal(false);
  };

  const handleEditIssue = () => {
    if (!editingIssue || editIssueDescription.trim() === '') return;

    const selectedAsset = assets ? assets.find(asset => asset.id === editIssueAssetId) : null;
    const editedIssueAssetName = selectedAsset ? selectedAsset.name : null;

    onUpdateIssue(siteId, editingIssue.id, {
      description: editIssueDescription.trim(),
      assignedTo: editIssueAssignedTo.trim() || 'Unassigned',
      importance: editIssueImportance,
      assetId: editIssueAssetId || null,
      assetName: editedIssueAssetName,
      dueDate: editIssueDueDate ? editIssueDueDate.toISOString().split('T')[0] : null,
    });
    closeEditModal();
  };

  const closeEditModal = () => {
    setShowEditIssueModal(false);
    setEditingIssue(null);
    setEditIssueDescription('');
    setEditIssueAssignedTo('');
    setEditIssueImportance('Medium');
    setEditIssueAssetId('');
    setEditIssueDueDate(null);
  };

  const openEditModal = (issue) => {
    setEditingIssue(issue);
    setEditIssueDescription(issue.description);
    setEditIssueAssignedTo(issue.assignedTo);
    setEditIssueImportance(issue.importance);
    setEditIssueAssetId(issue.assetId || '');
    setEditIssueDueDate(issue.dueDate ? new Date(issue.dueDate) : null);
    setShowEditIssueModal(true);
  };

  const handleIssueSort = (key) => {
    let direction = 'ascending';
    if (sortIssuesConfig.key === key && sortIssuesConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortIssuesConfig({ key, direction });
  };

  const filteredIssues = issues.filter(issue => showCompletedIssues || issue.status !== 'Completed');

  return (
    <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2 text-slate-200">
          <Icons.AlertTriangle /> Site Issue Tracker <span className="text-slate-400 text-sm">({issues.length} total, {issues.filter(issue => issue.status === 'Completed').length} completed)</span>
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="show-completed" className="text-sm text-slate-400 flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              id="show-completed"
              checked={showCompletedIssues}
              onChange={() => setShowCompletedIssues(!showCompletedIssues)}
              className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
            />
            Show Completed
          </label>

          <label htmlFor="issue-sort" className="text-sm text-slate-400">Sort By:</label>
          <select
            id="issue-sort"
            value={sortIssuesConfig.key}
            onChange={(e) => handleIssueSort(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm"
          >
            <option value="createdAt">Date</option>
            <option value="importance">Importance</option>
            <option value="dueDate">Due Date</option>
          </select>
          <button
            onClick={() => setSortIssuesConfig(prev => ({ ...prev, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' }))}
            className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-blue-400"
            title={`Sort ${sortIssuesConfig.direction === 'ascending' ? 'Descending' : 'Ascending'}`}
          >
            {sortIssuesConfig.direction === 'ascending' ? <Icons.SortAsc /> : <Icons.SortDesc />}
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center text-slate-400 py-4 italic">No issues logged for this site.</div>
        ) : (
          filteredIssues.sort((a, b) => {
            if (sortIssuesConfig.key === 'createdAt') {
              return sortIssuesConfig.direction === 'ascending'
                ? new Date(a.createdAt) - new Date(b.createdAt)
                : new Date(b.createdAt) - new Date(a.createdAt);
            }
            if (sortIssuesConfig.key === 'importance') {
              const importanceOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
              const aImportance = importanceOrder[a.importance] || 0;
              const bImportance = importanceOrder[b.importance] || 0;
              return sortIssuesConfig.direction === 'ascending'
                ? aImportance - bImportance
                : bImportance - aImportance;
            }
            if (sortIssuesConfig.key === 'dueDate') {
              const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
              const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
              return sortIssuesConfig.direction === 'ascending'
                ? aDate - bDate
                : bDate - aDate;
            }
            return 0;
          }).map((issue) => (
            <div key={issue.id} className="bg-slate-900 rounded p-3 border border-slate-700 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={issue.status === 'Completed'}
                    onChange={() => onToggleStatus(siteId, issue.id)}
                    className="rounded text-green-600 focus:ring-green-500 accent-green-600 cursor-pointer"
                  />
                  <span className={`text-sm ${issue.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                    {issue.description}
                  </span>
                </div>
                <div className="text-xs text-slate-400 ml-6 mt-1">
                  Asset: {issue.assetName || 'N/A'} | Assigned to: {issue.assignedTo} | Importance: <span className={`font-semibold ${issue.importance === 'High' ? 'text-red-400' : issue.importance === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>{issue.importance}</span> | Created: {formatDate(issue.createdAt, true)}
                  {issue.dueDate && ` | Due: ${formatDate(issue.dueDate, false)}`}
                  {issue.completedAt && ` | Completed: ${formatDate(issue.completedAt, true)}`}
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <Button onClick={() => openEditModal(issue)} variant="secondary">
                  <Icons.Edit /> Edit
                </Button>
                <Button onClick={() => onCopyIssue(issue)} variant="secondary">
                  <Icons.Copy /> Copy
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Button onClick={() => setShowAddIssueModal(true)} className="w-full justify-center">
        <Icons.Plus /> New Issue
      </Button>

      {/* Add Issue Modal */}
      {showAddIssueModal && (
        <Modal title="Add New Issue" onClose={() => setShowAddIssueModal(false)}>
          <div className="space-y-3">
            <textarea
              placeholder="Issue description..."
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              rows="5"
              value={newIssueDescription}
              onChange={(e) => setNewIssueDescription(e.target.value)}
            />
            <input
              type="text"
              placeholder="Assigned to (optional)..."
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={newIssueAssignedTo}
              onChange={(e) => setNewIssueAssignedTo(e.target.value)}
            />
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={newIssueImportance}
              onChange={(e) => setNewIssueImportance(e.target.value)}
            >
              <option value="Low">Low Importance</option>
              <option value="Medium">Medium Importance</option>
              <option value="High">High Importance</option>
            </select>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={newIssueAssetId}
              onChange={(e) => setNewIssueAssetId(e.target.value)}
            >
              <option value="">Select Asset (Optional)</option>
              {assets && assets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.name} ({asset.code})</option>
              ))}
            </select>
            <UniversalDatePicker
              selected={newIssueDueDate}
              onChange={(date) => setNewIssueDueDate(date)}
              placeholderText="Select Due Date (Optional)"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddIssue} disabled={newIssueDescription.trim() === ''} className="flex-1">
                <Icons.Plus /> Add Issue
              </Button>
              <Button onClick={() => setShowAddIssueModal(false)} variant="secondary" className="flex-1">
                <Icons.Cancel /> Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Issue Modal */}
      {showEditIssueModal && editingIssue && (
        <Modal title={`Edit Issue: ${editingIssue.id}`} onClose={closeEditModal}>
          <div className="space-y-3">
            <textarea
              placeholder="Issue description..."
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              rows="5"
              value={editIssueDescription}
              onChange={(e) => setEditIssueDescription(e.target.value)}
            />
            <input
              type="text"
              placeholder="Assigned to (optional)..."
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={editIssueAssignedTo}
              onChange={(e) => setEditIssueAssignedTo(e.target.value)}
            />
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={editIssueImportance}
              onChange={(e) => setEditIssueImportance(e.target.value)}
            >
              <option value="Low">Low Importance</option>
              <option value="Medium">Medium Importance</option>
              <option value="High">High Importance</option>
            </select>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
              value={editIssueAssetId}
              onChange={(e) => setEditIssueAssetId(e.target.value)}
            >
              <option value="">Select Asset (Optional)</option>
              {assets && assets.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.name} ({asset.code})</option>
              ))}
            </select>
            <UniversalDatePicker
              selected={editIssueDueDate}
              onChange={(date) => setEditIssueDueDate(date)}
              placeholderText="Select Due Date (Optional)"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleEditIssue} disabled={editIssueDescription.trim() === ''} className="flex-1">
                <Icons.Save /> Save Changes
              </Button>
              <Button onClick={closeEditModal} variant="secondary" className="flex-1">
                <Icons.Cancel /> Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
