import { describe, it, expect } from 'vitest';
import { getSiteHealthPercentages } from '../siteHealthCircle';

describe('getSiteHealthPercentages', () => {
  it('should return correct percentages for mixed assets', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, active: true },
        { id: 2, remaining: 15, active: true },
        { id: 3, remaining: 45, active: true },
        { id: 4, remaining: 60, active: false } // Should be ignored
      ],
      rollerData: [
        { id: 5, remaining: 20, active: true },
        { id: 6, remaining: 90, active: true }
      ]
    };
    
    const result = getSiteHealthPercentages(siteData);
    expect(result).toEqual({
      critical: 20, // 1 out of 5 active assets
      warning: 40,  // 2 out of 5 active assets  
      healthy: 40,  // 2 out of 5 active assets
      total: 5
    });
  });

  it('should return all healthy for all good assets', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 45, active: true },
        { id: 2, remaining: 60, active: true }
      ],
      rollerData: []
    };
    
    const result = getSiteHealthPercentages(siteData);
    expect(result).toEqual({
      critical: 0,
      warning: 0,
      healthy: 100,
      total: 2
    });
  });

  it('should return all critical for all overdue assets', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, active: true },
        { id: 2, remaining: -10, active: true }
      ],
      rollerData: []
    };
    
    const result = getSiteHealthPercentages(siteData);
    expect(result).toEqual({
      critical: 100,
      warning: 0,
      healthy: 0,
      total: 2
    });
  });

  it('should handle empty data gracefully', () => {
    const siteData = {
      serviceData: [],
      rollerData: []
    };
    
    const result = getSiteHealthPercentages(siteData);
    expect(result).toEqual({
      critical: 0,
      warning: 0,
      healthy: 100,
      total: 0
    });
  });

  it('should handle null/undefined data gracefully', () => {
    expect(getSiteHealthPercentages(null)).toEqual({
      critical: 0,
      warning: 0,
      healthy: 100,
      total: 0
    });
    
    expect(getSiteHealthPercentages(undefined)).toEqual({
      critical: 0,
      warning: 0,
      healthy: 100,
      total: 0
    });
  });

  it('should ignore inactive assets', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, active: false }, // Should be ignored
        { id: 2, remaining: 45, active: true }
      ],
      rollerData: []
    };
    
    const result = getSiteHealthPercentages(siteData);
    expect(result).toEqual({
      critical: 0,
      warning: 0,
      healthy: 100,
      total: 1
    });
  });
});
