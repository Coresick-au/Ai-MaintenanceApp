import { useMemo, useState } from "react";
import { useReporting } from "../../context/ReportingContext";
import { useReportingSettings } from "../../context/ReportingSettingsContext";
import { useTheme } from "../../context/ReportingThemeContext";
import { useGlobalData } from "../../../../context/GlobalDataContext";
import { F_, FS_, FC_, Ic, ICONS } from "../shared";
import { fmtDate } from "../../utils/reportUtils";
import { TECHS } from "../../data/initialData";
import { mapFromFirestoreFormat, generateReportCode } from "../../utils/dataMapper";
import { getAllEquipmentTypes } from "../../data/equipmentTypes";

export const GeneralStep = () => {
  const { cust, setCust, svc, setSvc, cal, setCal, comments, setComments, ast, setAst, intD, setIntD, selTpl, setSelTpl, nsd, selectedCustomerId, setSelectedCustomerId, selectedSiteId, setSelectedSiteId, selectedAssetId, setSelectedAssetId, loadFromAsset, showToast, eqType, handleEqTypeChange } = useReporting();
  const { tpls, dd } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const { customers, employees } = useGlobalData();

  // Build tech options from employees + hardcoded fallback
  const techOptions = useMemo(() => {
    const empNames = employees
      .filter(e => e.status === "active")
      .map(e => {
        const parts = [e.name];
        if (e.phone) parts.push(e.phone);
        if (e.email) parts.push(e.email);
        return parts.join(" - ");
      });
    // Merge: employees first, then any hardcoded ones not already in the list
    const all = [...empNames];
    TECHS.forEach(t => {
      const name = t.split(" - ")[0];
      if (!empNames.some(e => e.startsWith(name))) all.push(t);
    });
    return all;
  }, [employees]);

  // Build customer/site/asset dropdown options
  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.name })), [customers]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const siteOptions = useMemo(() => {
    if (!selectedCustomer) return [];
    return (selectedCustomer.managedSites || []).map(s => ({ value: s.id, label: s.name }));
  }, [selectedCustomer]);

  const selectedSite = selectedCustomer?.managedSites?.find(s => s.id === selectedSiteId);
  const assetOptions = useMemo(() => {
    if (!selectedSite) return [];
    return (selectedSite.serviceData || []).map(a => ({ value: a.id, label: `${a.name} (${a.code || "?"})` }));
  }, [selectedSite]);

  const handleCustomerChange = (custId) => {
    setSelectedCustomerId(custId);
    setSelectedSiteId("");
    setSelectedAssetId("");
    const customer = customers.find(c => c.id === custId);
    if (customer) {
      setCust(prev => ({ ...prev, name: customer.name }));
    }
  };

  const handleSiteChange = (siteId) => {
    setSelectedSiteId(siteId);
    setSelectedAssetId("");
    const site = selectedCustomer?.managedSites?.find(s => s.id === siteId);
    if (site) {
      // Filter contacts: sendReports === true AND (managedSites includes siteId OR managedSites is empty/global)
      const reportContacts = (selectedCustomer?.contacts || [])
        .filter(c => c.sendReports === true &&
          (!c.managedSites || c.managedSites.length === 0 || c.managedSites.includes(siteId))
        )
        .slice(0, 2);

      const c1 = reportContacts[0] || {};
      const c2 = reportContacts[1] || {};

      setCust(prev => ({
        ...prev,
        location: site.location || site.name || "",
        contact1: c1.name || "", email1: c1.email || "", phone1: c1.phone || "",
        contact2: c2.name || "", email2: c2.email || "", phone2: c2.phone || "",
      }));
    }
  };

  const clearContact2 = () => {
    setCust(prev => ({ ...prev, contact2: "", email2: "", phone2: "" }));
  };

  const handleAssetChange = (assetId) => {
    setSelectedAssetId(assetId);
    const asset = selectedSite?.serviceData?.find(a => a.id === assetId);
    if (asset) {
      setSvc(prev => ({ ...prev, asset: asset.name || "", cv: asset.code || "" }));
    }
  };

  // Copy Last Report
  const selectedAsset = selectedSite?.serviceData?.find(a => a.id === selectedAssetId);
  const hasReports = selectedAsset?.reports?.length > 0;

  const handleCopyLastReport = () => {
    if (!selectedAsset?.reports?.length) return;
    const sorted = [...selectedAsset.reports].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastReport = sorted[0];
    const mapped = mapFromFirestoreFormat(lastReport);

    // Switch equipment type if the copied report has a different type
    const reportEqType = mapped.equipmentType || "belt_weigher";
    if (reportEqType !== eqType) {
      handleEqTypeChange(reportEqType);
    }

    setCust(prev => ({ ...prev, ...mapped.cust }));
    setSvc(prev => ({ ...prev, ...mapped.svc, date: prev.date || "" }));
    setCal(mapped.cal);
    setComments(mapped.comments);
    setAst(mapped.ast);
    setIntD(mapped.intD);

    // Match template by name
    if (mapped.templateName) {
      const matchedTpl = tpls.find(tp => tp.name === mapped.templateName);
      if (matchedTpl) setSelTpl(matchedTpl);
    }

    showToast("Data copied from last report", "success");
  };

  const filteredTpls = tpls.filter(tp => (tp.equipmentType || "belt_weigher") === eqType);

  return (
    <>
      {/* Equipment Type Selector */}
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Equipment Type</span></div>
        <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {getAllEquipmentTypes().map(et => (
            <button key={et.id} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "8px 16px", border: eqType === et.id ? `1px solid ${t.accent}` : `1px solid ${t.border}`, borderRadius: 6, background: eqType === et.id ? t.accentBg : t.surfaceAlt, color: eqType === et.id ? t.accent : t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => handleEqTypeChange(et.id)}>
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Selector (filtered by equipment type) */}
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Report Template</span></div>
        <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filteredTpls.length > 0 ? filteredTpls.map(tp => (
            <button key={tp.id} style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: "8px 14px", border: selTpl?.id === tp.id ? `1px solid ${t.accent}` : `1px solid ${t.border}`, borderRadius: 6, background: selTpl?.id === tp.id ? t.accentBg : t.surfaceAlt, color: selTpl?.id === tp.id ? t.accent : t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setSelTpl(tp)}>
              <Ic d={ICONS.file} s={13} c={selTpl?.id === tp.id ? t.accent : t.textDim} />{tp.name}<span style={{ fontSize: 10, color: t.textFaint }}>({tp.params.length})</span>
            </button>
          )) : (
            <span style={{ fontSize: 12, color: t.textFaint, fontStyle: "italic" }}>No templates for this equipment type. Add one in Settings.</span>
          )}
        </div>
      </div>

      {/* Customer/Site/Asset Selector (Firebase) */}
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Select Customer & Asset</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g3}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={S.label}>Customer<span style={{ color: t.red, marginLeft: 3 }}>*</span></label>
              <select style={S.input} value={selectedCustomerId} onChange={e => handleCustomerChange(e.target.value)}>
                <option value="">Select customer...</option>
                {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={S.label}>Site<span style={{ color: t.red, marginLeft: 3 }}>*</span></label>
              <select style={S.input} value={selectedSiteId} onChange={e => handleSiteChange(e.target.value)} disabled={!selectedCustomerId}>
                <option value="">Select site...</option>
                {siteOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={S.label}>Asset<span style={{ color: t.red, marginLeft: 3 }}>*</span></label>
              <select style={{ ...S.input, ...(selectedSiteId && assetOptions.length === 0 ? { borderColor: t.amber } : {}) }} value={selectedAssetId} onChange={e => handleAssetChange(e.target.value)} disabled={!selectedSiteId || assetOptions.length === 0}>
                <option value="">{selectedSiteId && assetOptions.length === 0 ? "No assets on this site" : "Select asset..."}</option>
                {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {selectedSiteId && assetOptions.length === 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: t.amber + "18", border: `1px solid ${t.amber}44`, fontSize: 12, color: t.amber, display: "flex", alignItems: "center", gap: 8 }}>
              <Ic d={ICONS.warn} s={16} c={t.amber} />
              This site has no assets. Add assets to the site in the customer portal before creating a report.
            </div>
          )}
          {hasReports && (
            <div style={{ padding: "12px 0 0", borderTop: `1px solid ${t.border}`, marginTop: 12 }}>
              <button style={S.btnCyan} onClick={handleCopyLastReport}>
                <Ic d={ICONS.copy} s={14} /> Copy Last Report
              </button>
              <span style={{ marginLeft: 10, fontSize: 11, color: t.textFaint }}>
                {selectedAsset.reports.length} report{selectedAsset.reports.length !== 1 ? "s" : ""} on file
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Customer Details</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g2}>
            <F_ label="Customer Name" value={cust.name} onChange={v => setCust({ ...cust, name: v })} placeholder="e.g. Kestrel Coal Resources" />
            <F_ label="Site Location" value={cust.location} onChange={v => setCust({ ...cust, location: v })} placeholder="e.g. Crinum QLD" />
          </div>
          {/* Primary Contact */}
          <div style={{ marginTop: 14 }}>
            <div style={{ ...S.label, marginBottom: 8, fontSize: 10, letterSpacing: "0.06em" }}>PRIMARY CONTACT</div>
            <div style={S.g3}>
              <F_ label="Name" value={cust.contact1} onChange={v => setCust({ ...cust, contact1: v })} />
              <F_ label="Email" value={cust.email1} onChange={v => setCust({ ...cust, email1: v })} />
              <F_ label="Phone" value={cust.phone1} onChange={v => setCust({ ...cust, phone1: v })} />
            </div>
          </div>
          {/* Secondary Contact */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...S.label, fontSize: 10, letterSpacing: "0.06em" }}>SECONDARY CONTACT</div>
              {cust.contact2 && (
                <button style={{ ...S.btnIc, padding: "2px 6px", borderRadius: 4, border: `1px solid ${t.border}`, background: "transparent", fontSize: 10, color: t.red, cursor: "pointer" }} onClick={clearContact2} title="Remove secondary contact">
                  <Ic d={ICONS.x} s={12} c={t.red} />
                </button>
              )}
            </div>
            <div style={S.g3}>
              <F_ label="Name" value={cust.contact2} onChange={v => setCust({ ...cust, contact2: v })} />
              <F_ label="Email" value={cust.email2} onChange={v => setCust({ ...cust, email2: v })} />
              <F_ label="Phone" value={cust.phone2} onChange={v => setCust({ ...cust, phone2: v })} />
            </div>
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div style={S.card}>
        <div style={S.cH}><span style={S.cHT}>Service Information</span></div>
        <div style={{ padding: 16 }}>
          <div style={S.g2}>
            <F_ label="Asset Code/Name" value={svc.asset} onChange={v => setSvc({ ...svc, asset: v })} placeholder="e.g. Raw Coal Reclaim" />
            <F_ label="Conveyor Number" value={svc.cv} onChange={v => setSvc({ ...svc, cv: v })} placeholder="e.g. CV05" />
            <FS_ label="Service Type" value={svc.type} onChange={v => setSvc({ ...svc, type: v })} options={dd.serviceTypes} />
            <F_ label="Interval (Months)" value={svc.interval} onChange={v => setSvc({ ...svc, interval: v })} type="number" />
            <F_ label="Service Date" value={svc.date} onChange={v => setSvc({ ...svc, date: v })} type="date" required />
            <FC_ label="Next Service Date" value={nsd ? fmtDate(nsd) : "Set date & interval"} />
          </div>

          {/* Report Name / Job Number */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
            <div style={{ ...S.label, marginBottom: 8, fontSize: 10, letterSpacing: "0.06em" }}>REPORT NAME</div>
            <div style={S.g2}>
              <F_ label="Job Number" value={svc.jobNumber} onChange={v => setSvc({ ...svc, jobNumber: v })} placeholder="e.g. 12345" />
              <FC_ label="Report Code" value={generateReportCode(svc, eqType)} />
            </div>
          </div>

          {/* Technicians */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ ...S.label, fontSize: 10, letterSpacing: "0.06em" }}>TECHNICIANS</div>
              <button
                style={{ ...S.btnSm, color: t.accent }}
                onClick={() => setSvc({ ...svc, techs: [...(svc.techs || []), ""] })}
              >
                <Ic d={ICONS.plus} s={12} /> Add
              </button>
            </div>
            {(svc.techs || []).length === 0 && (
              <div style={{ fontSize: 12, color: t.textFaint, fontStyle: "italic", padding: "4px 0" }}>
                No technicians assigned. Click "Add" to assign.
              </div>
            )}
            {(svc.techs || []).map((tech, i) => {
              const parts = tech ? tech.split(" - ") : [];
              const name = parts[0] || "";
              const phone = parts[1] || "";
              const email = parts[2] || "";
              return (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <FS_
                      label={`Tech ${i + 1}`}
                      value={tech}
                      onChange={v => {
                        const updated = [...(svc.techs || [])];
                        updated[i] = v;
                        setSvc({ ...svc, techs: updated });
                      }}
                      options={techOptions}
                      display={x => x.split(" - ")[0]}
                      allowEmpty
                    />
                  </div>
                  {name && (
                    <div style={{ flex: "0 0 auto", paddingBottom: 2, fontSize: 11, color: t.textDim, whiteSpace: "nowrap" }}>
                      {phone && <span>{phone}</span>}
                      {phone && email && <span style={{ margin: "0 4px", color: t.textFaint }}>|</span>}
                      {email && <span>{email}</span>}
                    </div>
                  )}
                  <button
                    style={{ ...S.btnIc, padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", marginBottom: 2 }}
                    onClick={() => {
                      const updated = (svc.techs || []).filter((_, j) => j !== i);
                      setSvc({ ...svc, techs: updated });
                    }}
                    title="Remove technician"
                  >
                    <Ic d={ICONS.x} s={14} c={t.red} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
