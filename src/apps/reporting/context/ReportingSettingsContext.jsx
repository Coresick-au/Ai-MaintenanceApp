import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { INIT_DD, INIT_COMMENTS, INIT_TEMPLATES, INIT_UNITS, INIT_CATEGORIES } from "../data/initialData";
import { uid } from "../utils/reportUtils";
import { reportingSettingsRepository } from "../../../repositories";
import { registerCustomTypes } from "../data/equipmentTypes";

const SettingsCtx = createContext();
export const useReportingSettings = () => useContext(SettingsCtx);

export const ReportingSettingsProvider = ({ children }) => {
  const [dd, setDd] = useState(INIT_DD);
  const [cLib, setCLib] = useState(INIT_COMMENTS);
  const [tpls, setTpls] = useState(INIT_TEMPLATES);
  const [units, setUnits] = useState(INIT_UNITS);
  const [cats, setCats] = useState(INIT_CATEGORIES);
  const [condColors, setCondColors] = useState({});
  const [customEqTypes, setCustomEqTypes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Load settings from Firestore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await reportingSettingsRepository.getById("reporting");
        if (settings && !cancelled) {
          if (settings.dropdownOptions) setDd({ ...INIT_DD, ...settings.dropdownOptions });
          if (settings.commentLibrary) setCLib(settings.commentLibrary);
          if (settings.templates) setTpls(settings.templates);
          if (settings.units) setUnits(settings.units);
          if (settings.categories) setCats(settings.categories);
          if (settings.conditionColors) setCondColors(settings.conditionColors);
          if (settings.customEquipmentTypes) {
            setCustomEqTypes(settings.customEquipmentTypes);
            registerCustomTypes(settings.customEquipmentTypes);
          }
        }
      } catch (e) {
        console.warn("[ReportingSettings] Failed to load from Firestore, using defaults:", e.message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep runtime registry in sync when customEqTypes changes
  useEffect(() => {
    registerCustomTypes(customEqTypes);
  }, [customEqTypes]);

  // Debounced auto-save to Firestore
  const saveToFirestore = useCallback(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await reportingSettingsRepository.create("reporting", {
          dropdownOptions: dd,
          commentLibrary: cLib,
          templates: tpls,
          units,
          categories: cats,
          conditionColors: condColors,
          customEquipmentTypes: customEqTypes,
          updatedAt: new Date().toISOString(),
        });
        console.log("[ReportingSettings] Saved to Firestore");
      } catch (e) {
        console.warn("[ReportingSettings] Failed to save:", e.message);
      }
    }, 2000);
  }, [dd, cLib, tpls, units, cats, condColors, customEqTypes, loaded]);

  useEffect(() => { saveToFirestore(); }, [dd, cLib, tpls, units, cats, condColors, customEqTypes, saveToFirestore]);

  // Category CRUD
  const addCategory = (name) => {
    const trimmed = name.trim();
    if (!trimmed || cats.includes(trimmed)) return;
    setCats(prev => [...prev, trimmed]);
  };
  const removeCategory = (name) => {
    setCats(prev => prev.filter(c => c !== name));
    setCLib(prev => prev.filter(c => c.cat !== name));
  };
  const renameCategory = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || (trimmed !== oldName && cats.includes(trimmed))) return;
    setCats(prev => prev.map(c => c === oldName ? trimmed : c));
    setCLib(prev => prev.map(c => c.cat === oldName ? { ...c, cat: trimmed } : c));
  };

  // Comment CRUD
  const addComment = (cat, text) => {
    if (!cat || !text) return;
    if (!cats.includes(cat)) setCats(prev => [...prev, cat]);
    setCLib(prev => [...prev, { id: uid(), cat, text, on: true }]);
  };
  const updateComment = (id, data) => setCLib(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteComment = (id) => setCLib(prev => prev.filter(c => c.id !== id));
  const toggleComment = (id) => setCLib(prev => prev.map(c => c.id === id ? { ...c, on: !c.on } : c));

  // Condition color CRUD
  const setConditionColor = (condition, color) => {
    setCondColors(prev => {
      if (!color) {
        const next = { ...prev };
        delete next[condition];
        return next;
      }
      return { ...prev, [condition]: color };
    });
  };

  // Dropdown CRUD
  const addDropdownItem = (key, item) => {
    if (!item.trim()) return;
    setDd(prev => ({ ...prev, [key]: [...(prev[key] || []), item.trim()] }));
  };
  const removeDropdownItem = (key, index) => {
    setDd(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
  };

  // Template CRUD
  const addTemplate = (tpl) => setTpls(prev => [...prev, { ...tpl, id: "tpl_" + uid(), isDefault: false }]);
  const updateTemplate = (id, data) => setTpls(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  const deleteTemplate = (id) => setTpls(prev => prev.filter(t => t.id !== id));
  const duplicateTemplate = (tpl) => {
    setTpls(prev => [...prev, { ...tpl, id: "tpl_" + uid(), name: tpl.name + " (Copy)", isDefault: false, params: tpl.params.map(p => ({ ...p, id: uid() })) }]);
  };

  // Units CRUD
  const addUnit = (u) => {
    if (!u.trim() || units.includes(u.trim())) return;
    setUnits(prev => [...prev, u.trim()]);
  };
  const removeUnit = (u) => setUnits(prev => prev.filter(x => x !== u));

  // Custom Equipment Type CRUD
  const addCustomEqType = (eqType) => {
    // Compute defaultAst from assetFields
    const defaultAst = {};
    (eqType.assetFields || []).forEach(f => { defaultAst[f.key] = f.type === "condition" ? "Good" : ""; });
    const newType = { ...eqType, id: "eq_" + uid(), isBuiltIn: false, defaultAst, defaultCal: {}, hasFixedCal: false };
    setCustomEqTypes(prev => [...prev, newType]);
    // Auto-create any new dropdown keys referenced by asset fields
    (eqType.assetFields || []).forEach(f => {
      if (f.type === "dropdown" && f.dropdownKey && !dd[f.dropdownKey]) {
        setDd(prev => ({ ...prev, [f.dropdownKey]: [] }));
      }
    });
  };
  const updateCustomEqType = (id, data) => {
    // Recompute defaultAst if assetFields changed
    if (data.assetFields) {
      const defaultAst = {};
      data.assetFields.forEach(f => { defaultAst[f.key] = f.type === "condition" ? "Good" : ""; });
      data.defaultAst = defaultAst;
    }
    setCustomEqTypes(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    // Auto-create any new dropdown keys
    (data.assetFields || []).forEach(f => {
      if (f.type === "dropdown" && f.dropdownKey && !dd[f.dropdownKey]) {
        setDd(prev => ({ ...prev, [f.dropdownKey]: [] }));
      }
    });
  };
  const deleteCustomEqType = (id) => {
    setCustomEqTypes(prev => prev.filter(t => t.id !== id));
  };

  return (
    <SettingsCtx.Provider value={{
      dd, setDd, cLib, setCLib, tpls, setTpls, units, setUnits, cats, loaded, condColors, setConditionColor,
      customEqTypes, addCustomEqType, updateCustomEqType, deleteCustomEqType,
      addComment, updateComment, deleteComment, toggleComment,
      addCategory, removeCategory, renameCategory,
      addDropdownItem, removeDropdownItem,
      addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
      addUnit, removeUnit,
    }}>
      {children}
    </SettingsCtx.Provider>
  );
};
