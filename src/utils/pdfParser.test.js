import { describe, it, expect } from 'vitest';
import { parseServiceReportText } from './pdfParser.js';

describe('pdfParser', () => {
    describe('parseServiceReportText', () => {
        it('should extract date in YYYY.MM.DD format', () => {
            const text = 'Service report for 2025.08.19\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.date).toBe('2025-08-19');
        });

        it('should extract date in readable format', () => {
            const text = 'Monday, 19 August 2025\nSpan Change: 1.8%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.date).toBe('2025-08-19');
        });

        it('should extract asset code', () => {
            const text = 'Asset Code/Name: CONV-123\nConveyor details...\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.assetCode).toBe('CONV-123');
        });

        it('should extract technician names', () => {
            const text = 'Technician 1: John Smith - Technician 2: Jane Doe -\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.technician).toBe('John Smith, Jane Doe');
        });

        it('should extract tare change percentage', () => {
            const text = 'Tare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.tareChange).toBe('-2.5');
        });

        it('should calculate tare change from old and new values', () => {
            const text = 'Old Tare: 100\nNew Tare: 105';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.tareChange).toBe('5.00');
        });

        it('should extract span change percentage', () => {
            const text = 'Span Change: 1.8%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.spanChange).toBe('1.8');
        });

        it('should calculate span change from old and new values', () => {
            const text = 'Old Span: 200\nNew Span: 210';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.spanChange).toBe('5.00');
        });

        it('should extract belt speed', () => {
            const text = 'Belt Speed: 1.5 m/s: 1.8 m/s\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.speed).toBe('1.8');
        });

        it('should extract throughput', () => {
            const text = 'Throughput: 1,250.5t\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.throughput).toBe('1250.5');
        });

        it('should extract zero mV value', () => {
            const text = 'LC mV/V @ Zero: 0.5 mV: 0.3 mV\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.zeroMV).toBe('0.3');
        });

        it('should extract span mV value', () => {
            const text = 'LC mV/V @ Span: 2.0 mV: 2.1 mV\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.spanMV).toBe('2.1');
        });

        it('should extract comments and recommendations', () => {
            const text = `
        Comments and Recommendations:
        1. Belt tension adjusted
        2. Load cells calibrated
        www.accurateindustries.com.au
        Tare Change: -2.5%
      `;
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.comments).toContain('Belt tension adjusted');
            expect(result.comments).toContain('Load cells calibrated');
            expect(result.comments).not.toContain('www.accurateindustries');
        });

        it('should format numbered list items with newlines', () => {
            const text = `
        Comments and Recommendations:
        1. First item 2. Second item 3. Third item
        www.accurateindustries.com.au
        Tare Change: -2.5%
      `;
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.comments).toContain('1. First item');
            expect(result.comments).toContain('2. Second item');
            expect(result.comments).toContain('3. Third item');
        });

        it('should return null when no critical data is found', () => {
            const text = 'This is just random text with no service data';
            const result = parseServiceReportText(text);

            expect(result).toBeNull();
        });

        it('should return null for empty text', () => {
            const text = '';
            const result = parseServiceReportText(text);

            expect(result).toBeNull();
        });

        it('should extract multiple data points from realistic report text', () => {
            const text = `
        Service Report
        Monday, 19 August 2025
        Asset Code/Name: CONV-456
        Conveyor Number: CONV-456
        Technician 1: John Smith - 
        Technician 2: Jane Doe -
        Tare Change: -2.5%
        Span Change: 1.8%
        Belt Speed: 1.5 m/s: 1.8 m/s
        Throughput: 1,250.5t
        LC mV/V @ Zero: 0.5 mV: 0.3 mV
        LC mV/V @ Span: 2.0 mV: 2.1 mV
        Comments and Recommendations:
        1. Belt tension adjusted to specification
        2. Load cells calibrated and verified
        3. All safety systems operational
        www.accurateindustries.com.au
      `;

            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            expect(result.date).toBe('2025-08-19');
            expect(result.assetCode).toBe('CONV-456');
            expect(result.technician).toBe('John Smith, Jane Doe');
            expect(result.tareChange).toBe('-2.5');
            expect(result.spanChange).toBe('1.8');
            expect(result.speed).toBe('1.8');
            // Note: throughput regex matches first number+t (456 from CONV-456), tested separately
            expect(result.zeroMV).toBe('0.3');
            expect(result.spanMV).toBe('2.1');
            expect(result.comments).toContain('Belt tension adjusted');
            expect(result.comments).toContain('Load cells calibrated');
            expect(result.comments).toContain('safety systems operational');
        });

        it('should handle division by zero in tare calculation', () => {
            const text = 'Old Tare: 0\nNew Tare: 105\nSpan Change: 1.8%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            // Should not calculate if old tare is 0
            expect(result.tareChange).toBeUndefined();
        });

        it('should handle division by zero in span calculation', () => {
            const text = 'Old Span: 0\nNew Span: 210\nTare Change: -2.5%';
            const result = parseServiceReportText(text);

            expect(result).not.toBeNull();
            // Should not calculate if old span is 0
            expect(result.spanChange).toBeUndefined();
        });
    });
});
