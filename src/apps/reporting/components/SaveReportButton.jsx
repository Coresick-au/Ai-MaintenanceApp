import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../firebase";
import { useReporting } from "../context/ReportingContext";
import { useTheme } from "../context/ReportingThemeContext";
import { useReportingSettings } from "../context/ReportingSettingsContext";
import { useGlobalData } from "../../../context/GlobalDataContext";
import { Ic, ICONS } from "./shared";
import ReportPdfDocument from "../pdf/ReportPdfDocument";
import { mapToFirestoreFormat, generateFileName } from "../utils/dataMapper";

export const SaveReportButton = () => {
  const reportState = useReporting();
  const { cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD_, lD, spD, selectedCustomerId, selectedSiteId, selectedAssetId, showToast, currentDraftId, saveDraft, setShowPrint } = reportState;
  const { condColors } = useReportingSettings();
  const S = useTheme();
  const t = S.t;
  const { customers, updateManagedSite } = useGlobalData();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = selectedCustomerId && selectedSiteId && selectedAssetId && svc.date;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    try {
      // 1. Generate PDF blob
      const pdfDoc = (
        <ReportPdfDocument
          cust={cust} svc={svc} cal={cal} comments={comments} ast={ast}
          intD={intD} selTpl={selTpl} nsd={nsd}
          zD={zD} sD={sD_} lD={lD} spD={spD} condColors={condColors}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();
      const fileName = generateFileName(svc);

      // 2. Upload to Firebase Storage
      let downloadURL = null;
      try {
        const storageRef = ref(storage, `reports/${selectedAssetId}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(snapshot.ref);
        console.log("[SaveReport] Uploaded to:", downloadURL);
      } catch (uploadError) {
        console.warn("[SaveReport] Firebase upload failed (expected in localhost):", uploadError.message);
      }

      // 3. Build report entry in backward-compatible format
      const reportEntry = mapToFirestoreFormat(
        { cust, svc, cal, comments, ast, intD, selTpl, nsd, zD, sD_, lD, spD },
        downloadURL,
        fileName
      );

      // 4. Update the asset's reports array in Firestore
      const customer = customers.find(c => c.id === selectedCustomerId);
      const site = customer?.managedSites?.find(s => s.id === selectedSiteId);
      if (site) {
        const updatedServiceData = (site.serviceData || []).map(asset => {
          if (asset.id === selectedAssetId) {
            return { ...asset, reports: [...(asset.reports || []), reportEntry] };
          }
          return asset;
        });
        await updateManagedSite(selectedCustomerId, selectedSiteId, { serviceData: updatedServiceData });
        console.log("[SaveReport] Report saved to Firestore");
      }

      // Mark draft as completed if one exists
      if (currentDraftId) {
        try {
          await saveDraft(true);
        } catch (draftErr) {
          console.warn("[SaveReport] Failed to mark draft completed:", draftErr.message);
        }
      }

      setSaved(true);
      showToast("Report finalized successfully", "success");
      // Open print preview after finalization
      setTimeout(() => {
        setShowPrint(true);
        setSaved(false);
      }, 500);
    } catch (error) {
      console.error("[SaveReport] Error saving report:", error);
      showToast("Failed to save report. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!canSave) return null;

  return (
    <button
      style={{
        ...S.btnCyan,
        background: saved ? t.green : saving ? t.surfaceDeep : t.green + "22",
        color: saved ? "#fff" : t.green,
        borderColor: saved ? t.green : t.green,
        opacity: saving ? 0.7 : 1,
        fontWeight: 600,
      }}
      onClick={handleSave}
      disabled={saving}
    >
      {saving ? "Finalizing..." : saved ? (<><Ic d={ICONS.check} s={14} /> Finalized!</>) : (<><Ic d={ICONS.printer} s={14} /> Finalize & Print</>)}
    </button>
  );
};
