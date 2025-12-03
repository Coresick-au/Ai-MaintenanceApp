import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Polyfill DOMMatrix for pdfjs-dist in jsdom environment
global.DOMMatrix = class DOMMatrix {
    constructor() {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
    }
};

// Mock pdfjs-dist worker configuration
vi.mock('pdfjs-dist', async () => {
    const actual = await vi.importActual('pdfjs-dist');
    return {
        ...actual,
        GlobalWorkerOptions: {
            workerSrc: ''
        }
    };
});

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
    cleanup();
});

// Extend Vitest's expect with jest-dom matchers
global.expect = expect;
