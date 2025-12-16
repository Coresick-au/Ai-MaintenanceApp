import type { Shift, Rates, CalculatedShift, ShiftBreakdown } from './types';

export const getDuration = (startTime: string, finishTime: string): number => {
    if (!startTime || !finishTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = finishTime.split(':').map(Number);
    let diff = (endH + endM / 60) - (startH + startM / 60);
    if (diff < 0) diff += 24;
    return parseFloat(diff.toFixed(2));
};

export const calculateShiftBreakdown = (shift: Shift, rates: Rates): CalculatedShift => {
    const totalDuration = getDuration(shift.startTime, shift.finishTime);
    const siteHours = Math.max(0, totalDuration - (shift.travelIn + shift.travelOut));

    const breakdown: ShiftBreakdown = {
        travelInNT: 0,
        travelInOT: 0,
        siteNT: 0,
        siteOT: 0,
        travelOutNT: 0,
        travelOutOT: 0,
        totalHours: totalDuration,
        siteHours: siteHours
    };

    let cost = 0;

    if (shift.dayType === 'weekday') {
        if (shift.isNightShift) {
            // Night Shift: All hours are OT. Ignore 7.5h cap.
            breakdown.travelInNT = 0;
            breakdown.travelInOT = shift.travelIn;
            breakdown.siteNT = 0;
            breakdown.siteOT = siteHours;
            breakdown.travelOutNT = 0;
            breakdown.travelOutOT = shift.travelOut;

            // Unified cost: Travel charged at same rate as Site
            // Round each component to 2 decimal places before multiplying
            const totalOT = Math.round(shift.travelIn * 100) / 100 + Math.round(siteHours * 100) / 100 + Math.round(shift.travelOut * 100) / 100;
            cost += totalOT * rates.siteOvertime;
        } else {
            let hoursConsumed = 0;
            const ntLimit = rates.overtimeThreshold || 7.5;

            // 1. Travel In
            const travelInNT = Math.max(0, Math.min(shift.travelIn, ntLimit - hoursConsumed));
            const travelInOT = shift.travelIn - travelInNT;
            hoursConsumed += shift.travelIn;

            breakdown.travelInNT = Math.round(travelInNT * 100) / 100;
            breakdown.travelInOT = Math.round(travelInOT * 100) / 100;

            // 2. Site Time
            const siteNT = Math.max(0, Math.min(siteHours, ntLimit - hoursConsumed));
            const siteOT = siteHours - siteNT;
            hoursConsumed += siteHours;

            // Round breakdown values to 2 decimal places for precision
            breakdown.siteNT = Math.round(siteNT * 100) / 100;
            breakdown.siteOT = Math.round(siteOT * 100) / 100;

            // 3. Travel Out
            const travelOutNT = Math.max(0, Math.min(shift.travelOut, ntLimit - hoursConsumed));
            const travelOutOT = shift.travelOut - travelOutNT;
            hoursConsumed += shift.travelOut;

            breakdown.travelOutNT = Math.round(travelOutNT * 100) / 100;
            breakdown.travelOutOT = Math.round(travelOutOT * 100) / 100;

            // Unified cost calculation: Travel charged at same rate as Site
            // Round each component to 2 decimal places before multiplying
            const totalNT = Math.round(travelInNT * 100) / 100 + Math.round(siteNT * 100) / 100 + Math.round(travelOutNT * 100) / 100;
            const totalOT = Math.round(travelInOT * 100) / 100 + Math.round(siteOT * 100) / 100 + Math.round(travelOutOT * 100) / 100;

            cost += totalNT * rates.siteNormal;
            cost += totalOT * rates.siteOvertime;
        }

    } else if (shift.dayType === 'weekend') {
        // Weekend: All Site = Weekend Rate. Travel = Weekend Rate (unified).
        breakdown.siteNT = siteHours; // Using NT bucket for base hours
        breakdown.travelInOT = shift.travelIn;
        breakdown.travelOutOT = shift.travelOut;

        // Unified cost: All hours at weekend rate
        // Round each component to 2 decimal places before multiplying
        const totalHours = Math.round(siteHours * 100) / 100 + Math.round(shift.travelIn * 100) / 100 + Math.round(shift.travelOut * 100) / 100;
        cost += totalHours * rates.weekend;

    } else if (shift.dayType === 'publicHoliday') {
        // Public Holiday: All hours = PH Rate.
        breakdown.siteNT = siteHours;
        breakdown.travelInNT = shift.travelIn;
        breakdown.travelOutNT = shift.travelOut;

        // Unified cost: All hours at public holiday rate
        // Round each component to 2 decimal places before multiplying
        const totalHours = Math.round(siteHours * 100) / 100 + Math.round(shift.travelIn * 100) / 100 + Math.round(shift.travelOut * 100) / 100;
        cost += totalHours * rates.publicHoliday;
    }

    // Allowances
    if (shift.vehicle) {
        cost += rates.vehicle;
    }
    if (shift.perDiem) {
        cost += rates.perDiem;
    }

    return {
        cost,
        breakdown
    };
};
