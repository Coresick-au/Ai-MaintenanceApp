import { useState, useMemo } from "react";
import { useReporting } from "../context/ReportingContext";
import { useTheme } from "../context/ReportingThemeContext";
import { useGlobalData } from "../../../context/GlobalDataContext";
import { useAuth } from "../../../context/AuthContext";
import { Ic, ICONS } from "./shared";
import { generateReportCode } from "../utils/dataMapper";
import { getEquipmentType } from "../data/equipmentTypes";

export const ReportHub = () => {
  const { drafts, draftsLoaded, loadDraft, deleteDraft, setPage, resetForm, showToast, loadCompletedReport } = useReporting();
  const { customers, updateManagedSite } = useGlobalData();
  const { userRole } = useAuth();
  const { t, ...S } = useTheme();

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Aggregate completed reports from all customer assets
  const allCompletedReports = useMemo(() => {
    const reports = [];
    customers.forEach(customer => {
      (customer.managedSites || []).forEach(site => {
        (site.serviceData || []).forEach(asset => {
          (asset.reports || []).forEach(report => {
            reports.push({
              id: `${asset.id}-${report.id}`,
              type: "completed",
              customerName: customer.name,
              siteName: site.name || site.location || "",
              assetName: report.data?.general?.assetName || asset.name || "",
              reportCode: report.data?.general?.reportId || "",
              conveyorNumber: report.data?.general?.conveyorNumber || "",
              date: report.date || "",
              equipmentType: report.data?.equipmentType || "belt_weigher",
              storageUrl: report.storageUrl,
              fileName: report.fileName,
              source: "asset",
              customerId: customer.id,
              siteId: site.id,
              assetId: asset.id,
              raw: report,
            });
          });
        });
      });
    });
    return reports;
  }, [customers]);

  // Build unified list
  const unifiedList = useMemo(() => {
    const items = [];

    // Drafts
    drafts.filter(d => d.status !== "completed").forEach(d => {
      const draftEqType = d.equipmentType || "belt_weigher";
      items.push({
        id: d.id,
        type: "draft",
        customerName: d.customerName || "Untitled",
        siteName: d.siteName || "",
        assetName: d.assetName || "",
        reportCode: d.svc ? generateReportCode(d.svc, draftEqType) : "",
        conveyorNumber: d.svc?.cv || "",
        date: d.updatedAt || d.createdAt || "",
        step: d.step || 0,
        equipmentType: draftEqType,
        source: "draft",
        raw: d,
      });
    });

    // Completed reports from assets
    allCompletedReports.forEach(r => items.push(r));

    return items;
  }, [drafts, allCompletedReports]);

  // Filter
  const filteredList = useMemo(() => {
    return unifiedList
      .filter(item => {
        if (statusFilter !== "all" && item.type !== statusFilter) return false;
        if (customerFilter && item.customerName !== customerFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const searchable = `${item.customerName} ${item.siteName} ${item.assetName} ${item.conveyorNumber} ${item.reportCode}`.toLowerCase();
          if (!searchable.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [unifiedList, statusFilter, customerFilter, searchQuery]);

  // KPIs
  const totalReports = allCompletedReports.length;
  const draftCount = drafts.filter(d => d.status !== "completed").length;
  const now = new Date();
  const thisMonth = allCompletedReports.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const uniqueCustomers = new Set(allCompletedReports.map(r => r.customerName)).size;

  const handleItemClick = (item) => {
    if (item.source === "draft") {
      loadDraft(item.raw);
    }
    // For completed reports, we don't navigate on the main card click — use the action buttons instead
  };

  const handleViewInEditor = (e, item) => {
    e.stopPropagation();
    loadCompletedReport(item.raw, item.customerId, item.siteId, item.assetId);
    showToast("Report loaded into editor", "info");
  };

  const handleViewPdf = (e, item) => {
    e.stopPropagation();
    if (item.storageUrl) {
      window.open(item.storageUrl, "_blank");
    }
  };

  const handleDeleteDraft = (e, draftId) => {
    e.stopPropagation();
    setConfirmDeleteId(draftId);
  };

  const confirmDeleteDraft = async (draftId) => {
    await deleteDraft(draftId);
    showToast("Draft deleted", "info");
    setConfirmDeleteId(null);
  };

  const handleDeleteReport = (e, item) => {
    e.stopPropagation();
    if (userRole === "tech") {
      showToast("Manager permission required to delete reports", "info");
      return;
    }
    setConfirmDeleteId(item.id);
  };

  const confirmDeleteReport = async (item) => {
    try {
      const customer = customers.find(c => c.id === item.customerId);
      const site = customer?.managedSites?.find(s => s.id === item.siteId);
      if (site) {
        const updatedServiceData = (site.serviceData || []).map(asset => {
          if (asset.id === item.assetId) {
            return { ...asset, reports: (asset.reports || []).filter(r => r.id !== item.raw.id) };
          }
          return asset;
        });
        await updateManagedSite(item.customerId, item.siteId, { serviceData: updatedServiceData });
        showToast("Report deleted", "success");
      }
    } catch (err) {
      console.error("[ReportHub] Delete report failed:", err);
      showToast("Failed to delete report", "error");
    }
    setConfirmDeleteId(null);
  };

  const handleNewReport = () => {
    resetForm();
    setPage("report");
  };

  const kpis = [
    { label: "Total Reports", value: totalReports, color: t.accent },
    { label: "Drafts", value: draftCount, color: t.amber },
    { label: "This Month", value: thisMonth, color: t.green },
    { label: "Customers", value: uniqueCustomers, color: t.accent },
  ];

  const statusTabs = [
    { key: "all", label: "All" },
    { key: "draft", label: "Drafts" },
    { key: "completed", label: "Completed" },
  ];

  // Unique customer names for filter dropdown
  const customerNames = useMemo(() => {
    const names = new Set();
    unifiedList.forEach(item => { if (item.customerName) names.add(item.customerName); });
    return [...names].sort();
  }, [unifiedList]);

  if (!draftsLoaded) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Loading reports...</div>
      </div>
    );
  }

  const actionBtnStyle = {
    fontFamily: "inherit", fontSize: 10, fontWeight: 500, padding: "3px 8px",
    borderRadius: 4, border: `1px solid ${t.border}`, background: "transparent",
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
  };

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={S.card}>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: t.textFaint, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions + Filter Bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button style={S.btnCyan} onClick={handleNewReport}>
          <Ic d={ICONS.plus} s={14} /> New Report
        </button>
        <div style={{ flex: 1 }} />
        <input
          style={{ ...S.input, maxWidth: 240, fontSize: 12 }}
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          style={{ ...S.input, maxWidth: 200, fontSize: 12 }}
          value={customerFilter}
          onChange={e => setCustomerFilter(e.target.value)}
        >
          <option value="">All Customers</option>
          {customerNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                fontFamily: "inherit", fontSize: 11, fontWeight: 500, padding: "6px 12px",
                border: `1px solid ${statusFilter === tab.key ? t.accent : t.border}`,
                borderRadius: 6,
                background: statusFilter === tab.key ? t.accentBg : "transparent",
                color: statusFilter === tab.key ? t.accent : t.textMuted,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report List */}
      {filteredList.length === 0 ? (
        <div style={{ ...S.card, padding: 40, textAlign: "center" }}>
          <div style={{ color: t.textFaint, fontSize: 14 }}>
            {unifiedList.length === 0 ? "No reports yet. Create your first report!" : "No reports match your filters."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filteredList.map(item => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                ...S.card,
                cursor: item.source === "draft" ? "pointer" : "default",
                transition: "border-color 0.15s",
                borderColor: t.border,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + "66"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
            >
              <div style={{ padding: 16 }}>
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: t.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                    {item.assetName || "Untitled Report"}
                    {item.conveyorNumber && <span style={{ fontWeight: 400, color: t.textMuted, marginLeft: 6 }}>({item.conveyorNumber})</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.04em",
                      background: t.surfaceDeep, color: t.textDim,
                    }}>
                      {getEquipmentType(item.equipmentType).shortLabel}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
                      background: item.type === "draft" ? t.amber + "22" : t.green + "22",
                      color: item.type === "draft" ? t.amber : t.green,
                    }}>
                      {item.type}
                    </span>
                  </div>
                </div>
                {/* Details */}
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>{item.customerName}</div>
                <div style={{ fontSize: 11, color: t.textFaint, marginBottom: 2 }}>{item.siteName}</div>
                {item.reportCode && <div style={{ fontSize: 10, color: t.accent, fontFamily: "monospace" }}>{item.reportCode}</div>}
                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 10, color: t.textFaint }}>
                    {item.date ? new Date(item.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "--"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {item.type === "draft" && confirmDeleteId === item.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ color: t.textMuted }}>Delete?</span>
                        <button
                          onClick={e => { e.stopPropagation(); confirmDeleteDraft(item.id); }}
                          style={{ ...actionBtnStyle, color: t.red, borderColor: t.red + "66" }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          style={{ ...actionBtnStyle, color: t.textMuted }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : item.type === "draft" && (
                      <>
                        <span style={{ fontSize: 10, color: t.textDim }}>Step {(item.step || 0) + 1}/{getEquipmentType(item.equipmentType).steps.length}</span>
                        <button
                          onClick={e => handleDeleteDraft(e, item.id)}
                          style={{ ...S.btnIc, padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer" }}
                          title="Delete draft"
                        >
                          <Ic d={ICONS.trash} s={13} c={t.red} />
                        </button>
                      </>
                    )}
                    {item.type === "completed" && confirmDeleteId === item.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ color: t.textMuted }}>Delete?</span>
                        <button
                          onClick={e => { e.stopPropagation(); confirmDeleteReport(item); }}
                          style={{ ...actionBtnStyle, color: t.red, borderColor: t.red + "66" }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          style={{ ...actionBtnStyle, color: t.textMuted }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : item.type === "completed" && (
                      <>
                        <button
                          onClick={e => handleViewInEditor(e, item)}
                          style={{ ...actionBtnStyle, color: t.accent }}
                          title="View in editor"
                        >
                          <Ic d={ICONS.edit} s={11} c={t.accent} /> Editor
                        </button>
                        {item.storageUrl && (
                          <button
                            onClick={e => handleViewPdf(e, item)}
                            style={{ ...actionBtnStyle, color: t.green }}
                            title="View PDF"
                          >
                            <Ic d={ICONS.file} s={11} c={t.green} /> PDF
                          </button>
                        )}
                        <button
                          onClick={e => handleDeleteReport(e, item)}
                          style={{ ...S.btnIc, padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer" }}
                          title="Delete report"
                        >
                          <Ic d={ICONS.trash} s={13} c={t.red} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
