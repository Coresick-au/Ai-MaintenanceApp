import { useState } from "react";
import { useReporting } from "./context/ReportingContext";
import { useTheme } from "./context/ReportingThemeContext";
import { useGlobalData } from "../../context/GlobalDataContext";
import { Ic, ICONS } from "./components/shared";

import { GeneralStep } from "./components/steps/GeneralStep";
import { CalibrationStep } from "./components/steps/CalibrationStep";
import { CommentsStep } from "./components/steps/CommentsStep";
import { AssetInfoStep } from "./components/steps/AssetInfoStep";
import { IntegratorDataStep } from "./components/steps/IntegratorDataStep";

import { SettingsComments } from "./components/settings/SettingsComments";
import { SettingsDropdowns } from "./components/settings/SettingsDropdowns";
import { SettingsTemplates } from "./components/settings/SettingsTemplates";
import { TemplateEditorModal } from "./components/settings/TemplateEditorModal";
import { PrintPreview } from "./components/PrintPreview";
import { SaveReportButton } from "./components/SaveReportButton";
import { ReportHub } from "./components/ReportHub";
import { Toast } from "./components/shared/Toast";

export const ReportingApp = ({ onBack }) => {
  const { page, setPage, sTab, setSTab, step, setStep, steps, setShowPrint, showPrint, showTplEd, resetForm, toast, dismissToast, saveDraft, selectedCustomerId, selectedSiteId, selectedAssetId, svc, showToast } = useReporting();
  const { isDark, setIsDark, ...S } = useTheme();
  const t = S.t;
  const { loading } = useGlobalData();
  const [showNewReportConfirm, setShowNewReportConfirm] = useState(false);

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) {
      showToast("Select a customer first", "info");
      return;
    }
    try {
      await saveDraft(false);
      showToast("Draft saved", "success");
    } catch (e) {
      showToast("Failed to save draft", "error");
    }
  };

  const handleNewReport = () => {
    if (selectedCustomerId) {
      setShowNewReportConfirm(true);
    } else {
      resetForm();
    }
  };

  const confirmNewReport = () => {
    setShowNewReportConfirm(false);
    resetForm();
  };

  const handleNext = () => {
    if (step === 0) {
      if (!selectedCustomerId) { showToast("Select a customer to continue", "info"); return; }
      if (!selectedSiteId) { showToast("Select a site to continue", "info"); return; }
      if (!selectedAssetId) { showToast("Select an asset to continue", "info"); return; }
      if (!svc.date) { showToast("Enter a service date to continue", "info"); return; }
    }
    setStep(step + 1);
  };

  const stepComponents = [GeneralStep, CalibrationStep, CommentsStep, AssetInfoStep, IntegratorDataStep];
  const RenderStep = stepComponents[step] || GeneralStep;

  // Dynamic CSS for the reporting app's own theme
  const dynCSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    .reporting-app *{box-sizing:border-box}
    .reporting-app input:focus,.reporting-app select:focus,.reporting-app textarea:focus{border-color:${t.accent} !important;box-shadow:0 0 0 2px ${t.accentBorder} !important}
    .reporting-app select{cursor:pointer}.reporting-app button:disabled{opacity:0.4;cursor:not-allowed}.reporting-app ::placeholder{color:${t.textGhost}}
    .reporting-app ::-webkit-scrollbar{width:6px}.reporting-app ::-webkit-scrollbar-track{background:transparent}.reporting-app ::-webkit-scrollbar-thumb{background:${t.border};border-radius:3px}
    .reporting-app option{background:${t.surface};color:${t.text}}
  `;

  if (loading) {
    return (
      <div style={{ ...S.shell, display: "flex", alignItems: "center", justifyContent: "center" }} className="reporting-app">
        <div style={{ textAlign: "center", color: t.textMuted }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Loading data...</div>
          <div style={{ fontSize: 12 }}>Connecting to customer database</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.shell} className="reporting-app">
      <style>{dynCSS}</style>

      {/* Header */}
      <div style={S.hdr}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onBack && (
            <button
              style={{ ...S.btnIc, padding: "6px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.surfaceDeep }}
              onClick={onBack}
              title="Back to Portal"
            >
              <Ic d={ICONS.chL} s={18} c={t.accent} />
            </button>
          )}
          <img src="./logos/ai-logo.png" alt="Accurate Industries" style={{ height: 36, width: "auto" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Accurate Industries</div>
            <div style={{ fontSize: 11, color: t.textFaint }}>Belt Weigher Report Generator</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Theme toggle */}
          <button style={{ ...S.btnIc, padding: "6px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.surfaceDeep }} onClick={() => setIsDark(!isDark)} title={isDark ? "Switch to light" : "Switch to dark"}>
            <Ic d={isDark ? ICONS.sun : ICONS.moon} s={16} c={isDark ? "#f0c040" : t.accent} />
          </button>
          <div style={{ width: 1, height: 24, background: t.borderLight, margin: "0 4px" }} />
          <button style={{ ...S.navB, ...(page === "hub" ? S.navBA : {}) }} onClick={() => setPage("hub")}><Ic d={ICONS.file} s={14} /> All Reports</button>
          <button style={{ ...S.navB, ...(page === "report" ? S.navBA : {}) }} onClick={() => setPage("report")}><Ic d={ICONS.edit} s={14} /> Editor</button>
          <button style={{ ...S.navB, ...(page === "settings" ? S.navBA : {}) }} onClick={() => setPage("settings")}><Ic d={ICONS.settings} s={14} /> Settings</button>
          {page === "report" && (
            <>
              <div style={{ width: 1, height: 24, background: t.borderLight, margin: "0 4px" }} />
              <button style={S.btnCyan} onClick={() => setShowPrint(true)}><Ic d={ICONS.printer} s={14} /> Preview & Print</button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {page === "hub" ? (
          <ReportHub />
        ) : page === "report" ? (
          <>
            {/* Step tabs */}
            <div style={S.tabs}>
              {steps.map((s, i) => (
                <button key={i} onClick={() => setStep(i)} style={{ ...S.tab, ...(i === step ? S.tabA : {}), ...(i < step ? S.tabD : {}) }}>
                  <span style={{ ...S.tabN, ...(i === step ? S.tabNA : {}), ...(i < step ? S.tabND : {}) }}>
                    {i < step ? "\u2713" : i + 1}
                  </span>
                  {s}
                </button>
              ))}
            </div>

            {/* Current step */}
            <RenderStep />

            {/* Navigation + Save */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btnOut} onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                  <Ic d={ICONS.chL} s={14} /> Back
                </button>
                <button style={{ ...S.btnOut, color: t.amber }} onClick={handleNewReport}>
                  <Ic d={ICONS.plus} s={14} /> New Report
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.btnOut} onClick={handleSaveDraft}>
                  <Ic d={ICONS.file} s={14} /> Save Draft
                </button>
                {step < steps.length - 1
                  ? <button style={S.btnCyan} onClick={handleNext}>Next <Ic d={ICONS.chR} s={14} /></button>
                  : <SaveReportButton />
                }
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Settings tabs */}
            <div style={S.tabs}>
              {[["comments", "Comment Library"], ["dropdowns", "Equipment Dropdowns"], ["templates", "Report Templates"]].map(([k, l]) => (
                <button key={k} onClick={() => setSTab(k)} style={{ ...S.tab, ...(sTab === k ? S.tabA : {}) }}>{l}</button>
              ))}
            </div>
            {sTab === "comments" && <SettingsComments />}
            {sTab === "dropdowns" && <SettingsDropdowns />}
            {sTab === "templates" && <SettingsTemplates />}
          </>
        )}
      </div>

      {/* Modals */}
      {showPrint && <PrintPreview />}
      {showTplEd && <TemplateEditorModal />}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

      {/* New Report Confirmation */}
      {showNewReportConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={() => setShowNewReportConfirm(false)}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 24, maxWidth: 380, width: "90%", boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 8 }}>Start New Report?</div>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
              This will clear all current form data and start a fresh report. Your current draft has been auto-saved.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btnOut} onClick={() => setShowNewReportConfirm(false)}>Cancel</button>
              <button style={{ ...S.btnCyan, background: t.amber + "22", color: t.amber, borderColor: t.amber }} onClick={confirmNewReport}>
                <Ic d={ICONS.plus} s={14} /> New Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
