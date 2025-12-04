import { describe, it, expect } from 'vitest';
import { getOverallSiteHealth } from '../siteHealth';

describe('getOverallSiteHealth', () => {
  it('should return "critical" when any asset has negative remaining days', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, active: true },
        { id: 2, remaining: 45, active: true }
      ],
      rollerData: [
        { id: 3, remaining: 60, active: true }
      ]
    };
    expect(getOverallSiteHealth(siteData)).toBe('critical');
  });

  it('should return "critical" when any asset has opStatus "Down"', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 45, opStatus: 'Down', active: true }
      ],
      rollerData: []
    };
    expect(getOverallSiteHealth(siteData)).toBe('critical');
  });

  it('should return "warning" when any asset is due soon (0-29 days) and no critical issues', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 15, active: true },
        { id: 2, remaining: 45, active: true }
      ],
      rollerData: [
        { id: 3, remaining: 60, active: true }
      ]
    };
    expect(getOverallSiteHealth(siteData)).toBe('warning');
  });

  it('should return "warning" when any asset has opStatus "Warning" and no critical issues', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 45, opStatus: 'Warning', active: true }
      ],
      rollerData: []
    };
    expect(getOverallSiteHealth(siteData)).toBe('warning');
  });

  it('should return "healthy" when all assets are healthy (remaining >= 30)', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 30, active: true },
        { id: 2, remaining: 60, active: true }
      ],
      rollerData: [
        { id: 3, remaining: 90, active: true }
      ]
    };
    expect(getOverallSiteHealth(siteData)).toBe('healthy');
  });

  it('should return "healthy" when site has no assets', () => {
    const siteData = {
      serviceData: [],
      rollerData: []
    };
    expect(getOverallSiteHealth(siteData)).toBe('healthy');
  });

  it('should ignore inactive assets in health calculation', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, active: false }, // Should be ignored
        { id: 2, remaining: 45, active: true }
      ],
      rollerData: []
    };
    expect(getOverallSiteHealth(siteData)).toBe('healthy');
  });

  it('should handle null/undefined data gracefully', () => {
    expect(getOverallSiteHealth(null)).toBe('healthy');
    expect(getOverallSiteHealth(undefined)).toBe('healthy');
    expect(getOverallSiteHealth({})).toBe('healthy');
  });
});
