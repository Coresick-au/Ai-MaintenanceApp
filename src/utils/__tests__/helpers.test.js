import { describe, it, expect } from 'vitest';
import { calculateSiteHealth } from '../helpers';

describe('calculateSiteHealth', () => {
  it('should return "Good" for site with no data', () => {
    expect(calculateSiteHealth(null)).toBe('Good');
    expect(calculateSiteHealth(undefined)).toBe('Good');
    expect(calculateSiteHealth({})).toBe('Good');
  });

  it('should return "Good" for site with no assets', () => {
    const siteData = {
      serviceData: [],
      rollerData: []
    };
    expect(calculateSiteHealth(siteData)).toBe('Good');
  });

  it('should return "Overdue" for site with assets having remaining < 0', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: -5, opStatus: 'Down' }
      ],
      rollerData: []
    };
    expect(calculateSiteHealth(siteData)).toBe('Overdue');
  });

  it('should return "Overdue" for site with assets having opStatus "Down"', () => {
    const siteData = {
      serviceData: [],
      rollerData: [
        { id: 2, remaining: 45, opStatus: 'Down' }
      ]
    };
    expect(calculateSiteHealth(siteData)).toBe('Overdue');
  });

  it('should return "Warning" for site with assets having remaining between 0-29', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 15, opStatus: 'Warning' }
      ],
      rollerData: []
    };
    expect(calculateSiteHealth(siteData)).toBe('Warning');
  });

  it('should return "Warning" for site with assets having opStatus "Warning"', () => {
    const siteData = {
      serviceData: [],
      rollerData: [
        { id: 2, remaining: 45, opStatus: 'Warning' }
      ]
    };
    expect(calculateSiteHealth(siteData)).toBe('Warning');
  });

  it('should return "Good" for site with all assets having remaining >= 30', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 30, opStatus: 'Up' },
        { id: 2, remaining: 60, opStatus: 'Up' }
      ],
      rollerData: [
        { id: 3, remaining: 90, opStatus: 'Up' }
      ]
    };
    expect(calculateSiteHealth(siteData)).toBe('Good');
  });

  it('should return "Overdue" when mixed assets include any overdue items', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 60, opStatus: 'Up' },
        { id: 2, remaining: -10, opStatus: 'Down' }
      ],
      rollerData: [
        { id: 3, remaining: 45, opStatus: 'Warning' }
      ]
    };
    expect(calculateSiteHealth(siteData)).toBe('Overdue');
  });

  it('should return "Warning" when mixed assets include warnings but no overdue', () => {
    const siteData = {
      serviceData: [
        { id: 1, remaining: 60, opStatus: 'Up' },
        { id: 2, remaining: 15, opStatus: 'Warning' }
      ],
      rollerData: [
        { id: 3, remaining: 90, opStatus: 'Up' }
      ]
    };
    expect(calculateSiteHealth(siteData)).toBe('Warning');
  });
});
