import { useState } from "react";
import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { Ic, ICONS, SuggestInput } from "../shared";

export const SettingsComments = () => {
  const { showToast } = useReporting();
  const { cLib, setCLib, addComment, cats, addCategory, removeCategory, renameCategory } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const [editCmtId, setEditCmtId] = useState(null);
  const [newCmt, setNewCmt] = useState({ cat: "", text: "" });
  const [newCatName, setNewCatName] = useState("");
  const [editCatName, setEditCatName] = useState(null);
  const [editCatValue, setEditCatValue] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);
  const [confirmDeleteCmtId, setConfirmDeleteCmtId] = useState(null);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName("");
    showToast("Category added", "success");
  };

  const handleStartRename = (cat) => {
    setEditCatName(cat);
    setEditCatValue(cat);
  };

  const handleFinishRename = () => {
    if (editCatName && editCatValue.trim()) {
      renameCategory(editCatName, editCatValue.trim());
    }
    setEditCatName(null);
    setEditCatValue("");
  };

  const handleAddComment = () => {
    if (newCmt.cat && newCmt.text) {
      addComment(newCmt.cat, newCmt.text);
      setNewCmt({ cat: "", text: "" });
      showToast("Comment added", "success");
    }
  };

  const handleDeleteCategory = (cat) => {
    removeCategory(cat);
    setConfirmDeleteCat(null);
    showToast("Category deleted", "success");
  };

  const handleDeleteComment = (id) => {
    setCLib(cLib.filter(x => x.id !== id));
    setConfirmDeleteCmtId(null);
    showToast("Comment deleted", "success");
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Comment Library</h2>
        <p style={{ fontSize: 13, color: t.textDim }}>Manage pre-built comments technicians can select.</p>
      </div>

      {/* Add New Category */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cH}><span style={S.cHT}>Add New Category</span></div>
        <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Category Name</label>
            <input
              style={S.input}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Safety"
              onKeyDown={e => { if (e.key === "Enter") handleAddCategory(); }}
            />
          </div>
          <button style={S.btnCyan} onClick={handleAddCategory}>
            <Ic d={ICONS.plus} s={14} /> Add Category
          </button>
        </div>
      </div>

      {/* Add New Comment */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cH}><span style={S.cHT}>Add New Comment</span></div>
        <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 180px" }}>
            <label style={S.label}>Category</label>
            <SuggestInput style={S.input} value={newCmt.cat} onChange={v => setNewCmt({ ...newCmt, cat: v })} options={cats} placeholder="e.g. Cleaning" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Comment Text</label>
            <input style={S.input} value={newCmt.text} onChange={e => setNewCmt({ ...newCmt, text: e.target.value })} placeholder="Enter comment text..." />
          </div>
          <button style={S.btnCyan} onClick={handleAddComment}>
            <Ic d={ICONS.plus} s={14} /> Add
          </button>
        </div>
      </div>

      {/* Category Sections */}
      {cats.map(cat => {
        const catComments = cLib.filter(c => c.cat === cat);
        const isEmpty = catComments.length === 0;
        const isEditing = editCatName === cat;
        const isCatConfirming = confirmDeleteCat === cat;

        return (
          <div key={cat} style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ ...S.cH, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isEditing ? (
                  <input
                    style={{ ...S.input, fontSize: 12, fontWeight: 600, padding: "4px 8px", width: 180 }}
                    value={editCatValue}
                    onChange={e => setEditCatValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={e => { if (e.key === "Enter") handleFinishRename(); if (e.key === "Escape") { setEditCatName(null); } }}
                    autoFocus
                  />
                ) : (
                  <span style={S.cHT}>{cat}</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: t.accentBg, color: t.accent }}>{catComments.length}</span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {!isEditing && (
                  <button style={S.btnIc} onClick={() => handleStartRename(cat)} title="Rename category">
                    <Ic d={ICONS.edit} s={13} c={t.textDim} />
                  </button>
                )}
                {isCatConfirming ? (
                  <>
                    <button style={{ ...S.btnSm, color: t.red, padding: "2px 8px", fontSize: 10 }} onClick={() => handleDeleteCategory(cat)}>Confirm</button>
                    <button style={{ ...S.btnSm, padding: "2px 8px", fontSize: 10 }} onClick={() => setConfirmDeleteCat(null)}>Cancel</button>
                  </>
                ) : (
                  <button style={S.btnIc} onClick={() => setConfirmDeleteCat(cat)} title={isEmpty ? "Delete category" : "Delete category and all comments"}>
                    <Ic d={ICONS.trash} s={13} c={t.red} />
                  </button>
                )}
              </div>
            </div>
            {isEmpty ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: t.textFaint, fontStyle: "italic" }}>
                No comments in this category yet.
              </div>
            ) : (
              catComments.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${t.borderSub}` }}>
                  {editCmtId === c.id ? (
                    <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
                      <input style={{ ...S.input, flex: 1 }} value={c.text} onChange={e => setCLib(cLib.map(x => x.id === c.id ? { ...x, text: e.target.value } : x))} />
                      <button style={{ ...S.btnCyan, padding: "4px 8px" }} onClick={() => setEditCmtId(null)}><Ic d={ICONS.check} s={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, color: c.on ? t.textSec : t.textFaint, textDecoration: c.on ? "none" : "line-through" }}>{c.text}</span>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button style={S.btnIc} onClick={() => setCLib(cLib.map(x => x.id === c.id ? { ...x, on: !x.on } : x))}>
                          <div style={{ width: 32, height: 18, borderRadius: 9, background: c.on ? t.switchOn : t.toggleBg, transition: "0.2s", position: "relative" }}>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, left: c.on ? 16 : 2, transition: "0.2s" }} />
                          </div>
                        </button>
                        <button style={S.btnIc} onClick={() => setEditCmtId(c.id)}><Ic d={ICONS.edit} s={13} c={t.textDim} /></button>
                        {confirmDeleteCmtId === c.id ? (
                          <>
                            <button style={{ ...S.btnSm, color: t.red, padding: "2px 8px", fontSize: 10 }} onClick={() => handleDeleteComment(c.id)}>Confirm</button>
                            <button style={{ ...S.btnSm, padding: "2px 8px", fontSize: 10 }} onClick={() => setConfirmDeleteCmtId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button style={S.btnIc} onClick={() => setConfirmDeleteCmtId(c.id)}><Ic d={ICONS.trash} s={13} c={t.red} /></button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};
