// Test Setup Configuration
// TASK-0006: TDD Test Environment Setup

import { beforeAll, afterAll, vi, expect } from 'vitest';

// Global mock storage data
const mockStorageData: Record<string, any> = {};

// Global test setup
beforeAll(() => {
  // Mock Chrome Extension APIs
  
  Object.defineProperty(global, 'chrome', {
    value: {
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (keys?: string | string[]) => {
            if (!keys) return mockStorageData;
            if (typeof keys === 'string') {
              return { [keys]: mockStorageData[keys] };
            }
            const result: Record<string, any> = {};
            for (const key of keys) {
              if (key in mockStorageData) {
                result[key] = mockStorageData[key];
              }
            }
            return result;
          }),
          set: vi.fn().mockImplementation(async (items: Record<string, any>) => {
            Object.assign(mockStorageData, items);
          }),
          clear: vi.fn().mockImplementation(async () => {
            for (const key of Object.keys(mockStorageData)) {
              delete mockStorageData[key];
            }
          }),
          getBytesInUse: vi.fn().mockImplementation(async (keys?: string | string[]) => {
            let dataToMeasure: any;
            if (!keys) {
              dataToMeasure = mockStorageData;
            } else if (typeof keys === 'string') {
              dataToMeasure = { [keys]: mockStorageData[keys] };
            } else {
              dataToMeasure = {};
              for (const key of keys) {
                if (key in mockStorageData) {
                  dataToMeasure[key] = mockStorageData[key];
                }
              }
            }
            return JSON.stringify(dataToMeasure).length;
          }),
          QUOTA_BYTES: 5 * 1024 * 1024, // 5MB
          remove: vi.fn().mockImplementation(async (keys: string | string[]) => {
            const keysToRemove = Array.isArray(keys) ? keys : [keys];
            for (const key of keysToRemove) {
              delete mockStorageData[key];
            }
          }),
        },
      },
      runtime: {
        id: 'test-extension-id',
        getManifest: vi.fn(() => ({ version: '1.0.0' })),
      },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
    },
    writable: true,
  });

  // Mock Web Crypto API
  Object.defineProperty(global, 'crypto', {
    value: {
      subtle: {
        generateKey: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        importKey: vi.fn(),
        exportKey: vi.fn(),
      },
      getRandomValues: vi.fn().mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }),
    },
    writable: true,
  });

  // Mock performance API for timing tests
  if (!global.performance) {
    Object.defineProperty(global, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
      },
      writable: true,
    });
  }

  // Mock TextEncoder/TextDecoder for encryption tests
  if (!global.TextEncoder) {
    const MockTextEncoder = class {
      encode(input: string) {
        return new Uint8Array(Buffer.from(input, 'utf8'));
      }
    };
    (global as any).TextEncoder = MockTextEncoder;
  }

  if (!global.TextDecoder) {
    const MockTextDecoder = class {
      decode(input: ArrayBuffer | Uint8Array) {
        if (input instanceof ArrayBuffer) {
          return Buffer.from(input).toString('utf8');
        }
        return Buffer.from(input.buffer, input.byteOffset, input.byteLength).toString('utf8');
      }
    };
    (global as any).TextDecoder = MockTextDecoder;
  }

  // Suppress console outputs during tests unless explicitly testing console behavior
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Clean up mocks
  vi.restoreAllMocks();
});

// Test utilities available globally
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeWithinRange(floor: number, ceiling: number): T;
    }
  }
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  },
});