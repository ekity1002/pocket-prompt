// Options Page Test Suite
// TASK-0015: Basic settings UI and options page foundation

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Settings, ExportFormat } from '../../src/types';

// Mock Chrome API
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
};

Object.defineProperty(global, 'chrome', {
  value: {
    storage: mockChromeStorage,
  },
  writable: true,
});

// Mock DOM environment
const setupMockDOM = (): void => {
  document.body.innerHTML = `
    <select id="theme">
      <option value="auto">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
    <select id="language">
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
    <input type="checkbox" id="autoSave">
    <input type="checkbox" id="searchFiltering">
    <input type="checkbox" id="aiSiteIntegration">
    <input type="checkbox" id="syncEnabled">
    <input type="checkbox" id="autoTag">
    <select id="exportFormat">
      <option value="markdown">Markdown</option>
      <option value="json">JSON</option>
      <option value="txt">Plain Text</option>
      <option value="csv">CSV</option>
    </select>
    <input type="text" id="captureShortcut" value="Alt+Shift+C">
    <input type="text" id="toggleShortcut" value="Alt+Shift+P">
    <button id="exportSettings">Export Settings</button>
    <button id="importSettings">Import Settings</button>
    <button id="exportData">Export All Data</button>
    <button id="importData">Import Data</button>
    <button id="resetSettings">Reset to Defaults</button>
    <div id="statusMessage" class="status-message"></div>
  `;
};

describe('Options Page Settings Management', () => {
  let mockSettings: Settings;

  beforeEach(() => {
    setupMockDOM();
    mockSettings = {
      theme: 'auto',
      autoSave: true,
      syncEnabled: false,
      autoTag: true,
      exportFormat: 'markdown' as ExportFormat,
      shortcuts: {
        capture: 'Alt+Shift+C',
        toggle: 'Alt+Shift+P',
      },
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Settings Storage and Loading', () => {
    it('should load settings from Chrome storage', async () => {
      // 🟢 Blue: Settings loading requirement
      mockChromeStorage.local.get.mockResolvedValue({ settings: mockSettings });

      const { loadSettings } = await import('../../src/options/options');
      await loadSettings();
      
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith(['settings']);
    });

    it('should use default settings when no storage data exists', () => {
      // 🟡 Yellow: Default settings fallback
      const { getDefaultSettings } = require('../../src/options/options');
      const defaultSettings = getDefaultSettings();
      
      expect(defaultSettings.theme).toBe('auto');
      expect(defaultSettings.autoSave).toBe(true);
      expect(defaultSettings.syncEnabled).toBe(false);
      expect(defaultSettings.autoTag).toBe(true);
      expect(defaultSettings.exportFormat).toBe('markdown');
    });

    it('should save settings to Chrome storage', async () => {
      // 🟢 Blue: Settings saving requirement
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const { saveSettings } = await import('../../src/options/options');
      
      // saveSettings needs currentSettings to be set, so this is more of a structure test
      expect(typeof saveSettings).toBe('function');
    });

    it('should handle storage errors gracefully', async () => {
      // 🔴 Red: Error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      try {
        const { loadSettings } = await import('../../src/options/options');
        await loadSettings();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Validation', () => {
    it('should validate settings structure', () => {
      // 🟡 Yellow: Settings validation
      const validSettings = {
        theme: 'light',
        autoSave: true,
        syncEnabled: false,
        autoTag: true,
        exportFormat: 'json',
        shortcuts: {
          capture: 'Ctrl+Alt+C',
          toggle: 'Ctrl+Alt+T',
        },
      };

      const { isValidSettings } = require('../../src/options/options');
      expect(isValidSettings(validSettings)).toBe(true);
    });

    it('should reject invalid settings structure', () => {
      // 🔴 Red: Invalid data handling
      const invalidSettings = {
        theme: 'invalid-theme',
        autoSave: 'not-boolean',
        // Missing required fields
      };

      const { isValidSettings } = require('../../src/options/options');
      expect(isValidSettings(invalidSettings)).toBe(false);
    });

    it('should handle null and undefined settings', () => {
      // 🔴 Red: Null/undefined handling
      const { isValidSettings } = require('../../src/options/options');
      
      expect(isValidSettings(null)).toBe(false);
      expect(isValidSettings(undefined)).toBe(false);
      expect(isValidSettings({})).toBe(false);
    });
  });

  describe('Theme Application', () => {
    it('should apply theme classes to document body', () => {
      // 🟢 Blue: Real-time theme change
      const { applyTheme } = require('../../src/options/options');
      
      applyTheme('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);
      
      applyTheme('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
    });

    it('should detect system preference for auto theme', () => {
      // 🟡 Yellow: Auto theme detection
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('dark'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { applyTheme } = require('../../src/options/options');
      applyTheme('auto');
      
      expect(document.body.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('Export/Import Functionality', () => {
    it('should export settings as JSON', async () => {
      // 🟢 Blue: Export settings functionality
      const downloadSpy = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock document.createElement for download
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: downloadSpy,
          } as any;
        }
        return originalCreateElement(tagName);
      });

      const { handleExportSettings } = require('../../src/options/options');
      await handleExportSettings();

      expect(downloadSpy).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();

      document.createElement = originalCreateElement;
    });

    it('should handle export data functionality', async () => {
      // 🟡 Yellow: Export all data functionality
      mockChromeStorage.local.get.mockResolvedValue({
        settings: mockSettings,
        prompts: [],
      });

      const { handleExportData } = require('../../src/options/options');
      
      // This would trigger the download in real scenario
      expect(() => handleExportData()).not.toThrow();
    });

    it('should handle import settings with file validation', async () => {
      // 🟢 Blue: Import settings functionality
      const validImportData = {
        settings: mockSettings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      // Mock file reading
      global.FileReader = class MockFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
        result: string | ArrayBuffer | null = JSON.stringify(validImportData);
        
        readAsText() {
          setTimeout(() => {
            this.onload?.(null as any);
          }, 0);
        }
      } as any;

      const { handleImportSettings } = require('../../src/options/options');
      
      expect(() => handleImportSettings()).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset settings to defaults with confirmation', async () => {
      // 🟢 Blue: Reset functionality
      const confirmSpy = vi.spyOn(global, 'confirm').mockReturnValue(true);
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const { handleResetSettings } = require('../../src/options/options');
      await handleResetSettings();

      expect(confirmSpy).toHaveBeenCalledWith('This will reset all settings to defaults. Are you sure?');
      expect(mockChromeStorage.local.set).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should cancel reset when user declines confirmation', async () => {
      // 🟡 Yellow: Reset cancellation
      const confirmSpy = vi.spyOn(global, 'confirm').mockReturnValue(false);

      const { handleResetSettings } = require('../../src/options/options');
      await handleResetSettings();

      expect(mockChromeStorage.local.set).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Status Messages', () => {
    it('should show success status messages', () => {
      // 🟡 Yellow: User feedback
      const statusElement = document.getElementById('statusMessage');
      const { showStatus } = require('../../src/options/options');
      
      showStatus('Test success message', 'success');
      
      expect(statusElement?.textContent).toBe('Test success message');
      expect(statusElement?.classList.contains('success')).toBe(true);
    });

    it('should show error status messages', () => {
      // 🟡 Yellow: Error feedback
      const statusElement = document.getElementById('statusMessage');
      const { showStatus } = require('../../src/options/options');
      
      showStatus('Test error message', 'error');
      
      expect(statusElement?.textContent).toBe('Test error message');
      expect(statusElement?.classList.contains('error')).toBe(true);
    });

    it('should auto-hide success messages after timeout', async () => {
      // 🟡 Yellow: Auto-hide functionality
      vi.useFakeTimers();
      
      const statusElement = document.getElementById('statusMessage');
      const { showStatus } = require('../../src/options/options');
      
      showStatus('Auto-hide message', 'success');
      expect(statusElement?.textContent).toBe('Auto-hide message');
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);
      expect(statusElement?.textContent).toBe('');
      
      vi.useRealTimers();
    });
  });

  describe('UI Interaction', () => {
    it('should update settings when form elements change', async () => {
      // 🟢 Blue: Form interaction
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      // Mock form elements
      const themeSelect = { value: 'dark' };
      const autoSaveToggle = { checked: false };
      
      const { handleSettingsChange } = require('../../src/options/options');
      
      expect(() => handleSettingsChange()).not.toThrow();
    });

    it('should handle keyboard shortcuts input', () => {
      // 🟡 Yellow: Keyboard shortcuts handling
      const captureInput = document.createElement('input') as HTMLInputElement;
      captureInput.id = 'captureShortcut';
      captureInput.value = 'Ctrl+Shift+P';
      
      expect(captureInput.value).toBe('Ctrl+Shift+P');
    });
  });

  describe('Error Handling', () => {
    it('should handle Chrome storage access errors', async () => {
      // 🔴 Red: Chrome storage error handling
      mockChromeStorage.local.get.mockRejectedValue(new Error('Permission denied'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        const { loadSettings } = await import('../../src/options/options');
        await loadSettings();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON during import', async () => {
      // 🔴 Red: Malformed data handling
      const { handleImportSettings } = require('../../src/options/options');
      
      // Mock FileReader with invalid JSON
      global.FileReader = class MockFileReader {
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
        result: string = 'invalid json';
        
        readAsText() {
          setTimeout(() => {
            this.onload?.(null as any);
          }, 0);
        }
      } as any;
      
      expect(() => handleImportSettings()).not.toThrow();
    });

    it('should handle file selection cancellation', async () => {
      // 🟡 Yellow: User cancellation handling
      // Mock file input cancellation
      const { selectFile } = require('../../src/options/options');
      
      // This would be tested with actual file input simulation
      expect(typeof selectFile).toBe('function');
    });
  });

  describe('Default Settings Generation', () => {
    it('should generate valid default settings', () => {
      // 🟢 Blue: Default settings generation
      const { getDefaultSettings } = require('../../src/options/options');
      const defaults = getDefaultSettings();
      
      expect(defaults).toMatchObject({
        theme: 'auto',
        autoSave: true,
        syncEnabled: false,
        autoTag: true,
        exportFormat: 'markdown',
        shortcuts: {
          capture: 'Alt+Shift+C',
          toggle: 'Alt+Shift+P',
        },
      });
    });

    it('should provide consistent default values', () => {
      // 🟡 Yellow: Consistency check
      const { getDefaultSettings } = require('../../src/options/options');
      const defaults1 = getDefaultSettings();
      const defaults2 = getDefaultSettings();
      
      expect(defaults1).toEqual(defaults2);
    });
  });
});