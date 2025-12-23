/**
 * Cost forecasting utilities using linear regression
 * @description Provides statistical analysis of historical cost data to predict
 * future costs. Uses simple linear regression for trend analysis.
 */

/**
 * Calculate linear regression trend from historical data points
 * @description Performs least squares linear regression to find the best-fit line
 * through historical cost data. Returns slope, intercept, and R² correlation coefficient.
 * @param {Array<{date: Date, cost: number}>} dataPoints - Array of date/cost pairs
 * @returns {{slope: number, intercept: number, r2: number}|null} Trend parameters or null if insufficient data
 * @example
 * const trend = calculateLinearTrend([
 *   { date: new Date('2025-01-01'), cost: 1000 },
 *   { date: new Date('2025-02-01'), cost: 1100 }
 * ]);
 * // returns { slope: 3.2, intercept: 950, r2: 0.98 }
 */
export function calculateLinearTrend(dataPoints) {
    if (!dataPoints || dataPoints.length < 2) {
        return null;
    }

    // Convert dates to numeric timestamps (milliseconds since epoch)
    const points = dataPoints.map(p => ({
        x: new Date(p.date).getTime(),
        y: p.cost
    }));

    const n = points.length;

    // Calculate means
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;

    // Calculate slope and intercept using least squares method
    let numerator = 0;
    let denominator = 0;
    let ssTotal = 0;
    let ssResidual = 0;

    for (const point of points) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        numerator += dx * dy;
        denominator += dx * dx;
        ssTotal += dy * dy;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    // Calculate R² (coefficient of determination)
    for (const point of points) {
        const predicted = slope * point.x + intercept;
        ssResidual += Math.pow(point.y - predicted, 2);
    }

    const r2 = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);

    return {
        slope,
        intercept,
        r2: Math.max(0, Math.min(1, r2)) // Clamp between 0 and 1
    };
}

/**
 * Forecast cost at a future date based on historical trends
 * @description Uses linear regression on historical cost data to predict the cost
 * at a target date. Returns forecasted cost and confidence level based on R².
 * @param {Array<{effectiveDate: string, costPrice: number}>} historicalCosts - Historical cost entries
 * @param {Date|string} targetDate - Date to forecast for
 * @returns {{forecastedCost: number, confidence: number}|null} Forecast with confidence or null if insufficient data
 * @example
 * const forecast = forecastCostAtDate(costHistory, new Date('2025-12-31'));
 * // returns { forecastedCost: 1350, confidence: 0.95 }
 */
export function forecastCostAtDate(historicalCosts, targetDate) {
    if (!historicalCosts || historicalCosts.length < 2) {
        return null;
    }

    // Convert historical costs to data points
    const dataPoints = historicalCosts.map(entry => ({
        date: new Date(entry.effectiveDate),
        cost: entry.costPrice
    }));

    const trend = calculateLinearTrend(dataPoints);

    if (!trend) {
        return null;
    }

    // Convert target date to timestamp
    const targetTimestamp = targetDate instanceof Date
        ? targetDate.getTime()
        : new Date(targetDate).getTime();

    // Calculate forecasted cost using trend line equation: y = mx + b
    const forecastedCost = Math.round(trend.slope * targetTimestamp + trend.intercept);

    return {
        forecastedCost: Math.max(0, forecastedCost), // Ensure non-negative
        confidence: trend.r2 // R² as confidence measure (0-1)
    };
}
