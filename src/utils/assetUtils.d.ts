// TypeScript declaration file for assetUtils.js
export function getUniqueAssets(serviceData: any[], rollerData: any[]): any[];
export function countUniqueAssets(serviceData: any[], rollerData: any[]): number;
export function getAssetHealthMetrics(serviceData: any[], rollerData: any[]): {
    critical: number;
    dueSoon: number;
    healthy: number;
    total: number;
    criticalPct: number;
    dueSoonPct: number;
    healthyPct: number;
};
