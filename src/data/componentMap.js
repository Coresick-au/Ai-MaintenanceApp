export const componentMapData = `
graph TD;
  App[App] --> SiteContext;
  App --> UIContext;
  App --> FilterContext;
  App --> AppHistoryModal;
  click AppHistoryModal call handleNodeClick("AppHistoryModal") "Click to Navigate";
  App --> AppMapModal;
  click AppMapModal call handleNodeClick("AppMapModal") "Click to Navigate";
  App --> AssetAnalytics;
  click AssetAnalytics call handleNodeClick("AssetAnalytics") "Click to Navigate";
  App --> AssetModals;
  click AssetModals call handleNodeClick("AssetModals") "Click to Navigate";
  App --> AssetTimeline;
  click AssetTimeline call handleNodeClick("AssetTimeline") "Click to Navigate";
  App --> CustomerReportModal;
  click CustomerReportModal call handleNodeClick("CustomerReportModal") "Click to Navigate";
  App --> MasterListModal;
  click MasterListModal call handleNodeClick("MasterListModal") "Click to Navigate";
  App --> SiteDropdown;
  click SiteDropdown call handleNodeClick("SiteDropdown") "Click to Navigate";
  App --> SiteIssueTracker;
  click SiteIssueTracker call handleNodeClick("SiteIssueTracker") "Click to Navigate";
  App --> SiteModals;
  click SiteModals call handleNodeClick("SiteModals") "Click to Navigate";
  App --> UIComponents;
  click UIComponents call handleNodeClick("UIComponents") "Click to Navigate";

`;