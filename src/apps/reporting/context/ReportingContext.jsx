import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { calcDiff, addMonths } from "../utils/reportUtils";
import { mapFromFirestoreFormat } from "../utils/dataMapper";
import { useReportingSettings } from "./ReportingSettingsContext";
import { reportDraftRepository } from "../../../repositories";
import { useAuth } from "../../../context/AuthContext";
import { DEFAULT_EQUIPMENT_TYPE, getEquipmentType } from "../data/equipmentTypes";

const ReportingCtx = createContext();
export const useReporting = () => useContext(ReportingCtx);

const INIT_CUST = { name: "", location: "", contact1: "", email1: "", phone1: "", contact2: "", email2: "", phone2: "" };
const INIT_SVC = { asset: "", cv: "", type: "12 Weekly", interval: "3", date: "", techs: [], jobNumber: "" };

export const ReportingProvider = ({ children }) => {
  const { tpls } = useReportingSettings();
  const { currentUser } = useAuth();

  // Navigation
  const [page, setPage] = useState("hub");
  const [sTab, setSTab] = useState("comments");
  const [step, setStep] = useState(0);

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Equipment type
  const [eqType, setEqType] = useState(DEFAULT_EQUIPMENT_TYPE);
  const eqConfig = getEquipmentType(eqType);

  // Form state (intD = template-driven data: integrator params for BW, calibration params for TMD)
  const [cust, setCust] = useState(INIT_CUST);
  const [svc, setSvc] = useState(INIT_SVC);
  const [cal, setCal] = useState(eqConfig.defaultCal);
  const [comments, setComments] = useState("");
  const [ast, setAst] = useState(eqConfig.defaultAst);
  const [intD, setIntD] = useState({});
  const [selTpl, setSelTpl] = useState(tpls.find(t => (t.equipmentType || "belt_weigher") === DEFAULT_EQUIPMENT_TYPE) || tpls[0] || null);

  // UI state
  const [showPrint, setShowPrint] = useState(false);
  const [showTplEd, setShowTplEd] = useState(false);
  const [editTplId, setEditTplId] = useState(null);
  const [tplDraft, setTplDraft] = useState({ name: "", desc: "", params: [] });

  // Firebase context for selected customer/site/asset IDs
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");

  // === DRAFT MANAGEMENT ===
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const draftIdRef = useRef(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const autoSaveTimer = useRef(null);

  // Load all drafts on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const allDrafts = await reportDraftRepository.getAll();
        if (!cancelled) {
          setDrafts(allDrafts);
          setDraftsLoaded(true);
        }
      } catch (e) {
        console.warn("[Reporting] Failed to load drafts:", e.message);
        if (!cancelled) setDraftsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save draft (uses ref to prevent duplicate creation from concurrent saves)
  const saveDraft = useCallback(async (markCompleted = false) => {
    const activeId = draftIdRef.current;
    const draftData = {
      ...(activeId ? { id: activeId } : {}),
      status: markCompleted ? "completed" : "draft",
      createdBy: currentUser?.uid || "unknown",
      equipmentType: eqType,
      customerId: selectedCustomerId,
      customerName: cust.name,
      siteId: selectedSiteId,
      siteName: cust.location,
      assetId: selectedAssetId,
      assetName: svc.asset,
      cust, svc, cal, comments, ast, intD,
      selTpl: selTpl ? { id: selTpl.id, name: selTpl.name, desc: selTpl.desc, equipmentType: selTpl.equipmentType, params: selTpl.params } : null,
      step,
    };

    const saved = await reportDraftRepository.save(draftData);
    draftIdRef.current = saved.id;
    setCurrentDraftId(saved.id);

    // Update local drafts list
    setDrafts(prev => {
      const idx = prev.findIndex(d => d.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });

    return saved;
  }, [currentUser, selectedCustomerId, selectedSiteId, selectedAssetId, cust, svc, cal, comments, ast, intD, selTpl, step, eqType]);

  // Load draft into form
  const loadDraft = useCallback((draft) => {
    draftIdRef.current = draft.id;
    setCurrentDraftId(draft.id);

    const draftEqType = draft.equipmentType || "belt_weigher";
    const config = getEquipmentType(draftEqType);
    setEqType(draftEqType);

    setCust(draft.cust || INIT_CUST);
    // Migrate old tech1/tech2 format to techs array
    const draftSvc = draft.svc || INIT_SVC;
    if (!draftSvc.techs && (draftSvc.tech1 !== undefined || draftSvc.tech2 !== undefined)) {
      draftSvc.techs = [draftSvc.tech1, draftSvc.tech2].filter(t => t && t !== "N/A");
      delete draftSvc.tech1;
      delete draftSvc.tech2;
    }
    setSvc(draftSvc);
    setCal(draft.cal || config.defaultCal);
    setComments(draft.comments || "");
    setAst(draft.ast || config.defaultAst);
    setIntD(draft.intD || {});
    if (draft.selTpl) {
      const matchedTpl = tpls.find(t => t.id === draft.selTpl.id) || draft.selTpl;
      setSelTpl(matchedTpl);
    } else {
      // Auto-select first template for this equipment type
      const matchingTpl = tpls.find(t => (t.equipmentType || "belt_weigher") === draftEqType);
      setSelTpl(matchingTpl || null);
    }
    setSelectedCustomerId(draft.customerId || "");
    setSelectedSiteId(draft.siteId || "");
    setSelectedAssetId(draft.assetId || "");
    setStep(draft.step || 0);
    setPage("report");
  }, [tpls]);

  // Delete draft
  const deleteDraft = useCallback(async (draftId) => {
    await reportDraftRepository.delete(draftId);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    if (currentDraftId === draftId) { draftIdRef.current = null; setCurrentDraftId(null); }
  }, [currentDraftId]);

  // Auto-save draft (5s debounce, only when customer is selected)
  useEffect(() => {
    if (!selectedCustomerId || !draftsLoaded) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(false).catch(e => console.warn("[Reporting] Auto-save failed:", e.message));
    }, 5000);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [cust, svc, cal, comments, ast, intD, selTpl?.id, step, selectedCustomerId, selectedSiteId, selectedAssetId, draftsLoaded, eqType]);

  // Sync template-driven data when template changes
  useEffect(() => {
    if (!selTpl) return;
    const nd = {};
    selTpl.params.forEach(p => {
      if ((p.type || "cal") === "val") {
        nd[p.id] = intD[p.id] || { val: "" };
      } else {
        nd[p.id] = intD[p.id] || { af: "", al: "", incPct: false };
      }
    });
    setIntD(nd);
  }, [selTpl?.id]);

  // Handle equipment type change
  const handleEqTypeChange = useCallback((newType) => {
    if (newType === eqType) return;
    const config = getEquipmentType(newType);
    setEqType(newType);
    setAst(config.defaultAst);
    setCal(config.defaultCal);
    setIntD({});
    setStep(0);
    // Auto-select first matching template
    const matchingTpl = tpls.find(t => (t.equipmentType || "belt_weigher") === newType);
    setSelTpl(matchingTpl || null);
  }, [eqType, tpls]);

  // Computed values
  const nsd = addMonths(svc.date, svc.interval);
  const zD = calcDiff(cal.oz, cal.nz);
  const sD_ = calcDiff(cal.os, cal.ns);
  const lD = calcDiff(cal.ol, cal.nl);
  const spD = calcDiff(cal.osp, cal.nsp);

  // Steps derived from equipment type
  const steps = eqConfig.steps.map(s => s.label);
  const stepKeys = eqConfig.steps.map(s => s.key);

  // Reset form
  const resetForm = () => {
    const defConfig = getEquipmentType(DEFAULT_EQUIPMENT_TYPE);
    setEqType(DEFAULT_EQUIPMENT_TYPE);
    setCust(INIT_CUST);
    setSvc(INIT_SVC);
    setCal(defConfig.defaultCal);
    setComments("");
    setAst(defConfig.defaultAst);
    setIntD({});
    setStep(0);
    setSelectedCustomerId("");
    setSelectedSiteId("");
    setSelectedAssetId("");
    draftIdRef.current = null;
    setCurrentDraftId(null);
    // Reset to first BW template
    const matchingTpl = tpls.find(t => (t.equipmentType || "belt_weigher") === DEFAULT_EQUIPMENT_TYPE);
    setSelTpl(matchingTpl || tpls[0] || null);
  };

  // Load from asset (auto-populate from Firebase data)
  const loadFromAsset = (customer, site, asset) => {
    if (customer) {
      setCust(prev => ({
        ...prev,
        name: customer.name || "",
        location: site?.location || site?.name || "",
      }));
      setSelectedCustomerId(customer.id || "");
    }
    if (site) {
      setSelectedSiteId(site.id || "");
    }
    if (asset) {
      setSvc(prev => ({
        ...prev,
        asset: asset.name || "",
        cv: asset.code || "",
      }));
      setSelectedAssetId(asset.id || "");
    }
  };

  // Load a completed report into the editor (read-only view of data)
  const loadCompletedReport = useCallback((report, customerId, siteId, assetId) => {
    const mapped = mapFromFirestoreFormat(report);
    const reportEqType = mapped.equipmentType || "belt_weigher";
    const config = getEquipmentType(reportEqType);

    draftIdRef.current = null;
    setCurrentDraftId(null);
    setEqType(reportEqType);
    setCust(mapped.cust);
    const svcWithDate = { ...mapped.svc, date: report.data?.general?.serviceDate || "" };
    setSvc(svcWithDate);
    setCal(mapped.cal || config.defaultCal);
    setComments(mapped.comments);
    setAst(mapped.ast || config.defaultAst);
    setIntD(mapped.intD);
    if (mapped.templateName) {
      const matchedTpl = tpls.find(tp => tp.name === mapped.templateName);
      if (matchedTpl) setSelTpl(matchedTpl);
    }
    setSelectedCustomerId(customerId || "");
    setSelectedSiteId(siteId || "");
    setSelectedAssetId(assetId || "");
    setStep(0);
    setPage("report");
  }, [tpls]);

  return (
    <ReportingCtx.Provider value={{
      // Navigation
      page, setPage, sTab, setSTab, step, setStep, steps, stepKeys,
      // Equipment type
      eqType, setEqType, handleEqTypeChange,
      // Form state
      cust, setCust, svc, setSvc, cal, setCal, comments, setComments, ast, setAst, intD, setIntD,
      selTpl, setSelTpl,
      // UI
      showPrint, setShowPrint, showTplEd, setShowTplEd, editTplId, setEditTplId, tplDraft, setTplDraft,
      // Computed
      nsd, zD, sD_, lD, spD,
      // Firebase selection
      selectedCustomerId, setSelectedCustomerId, selectedSiteId, setSelectedSiteId, selectedAssetId, setSelectedAssetId,
      // Toast
      toast, showToast, dismissToast,
      // Drafts
      currentDraftId, drafts, draftsLoaded, saveDraft, loadDraft, deleteDraft,
      // Actions
      resetForm, loadFromAsset, loadCompletedReport,
    }}>
      {children}
    </ReportingCtx.Provider>
  );
};
