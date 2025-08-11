// Options page script for Pocket-Prompt Chrome Extension
// TASK-0015: Basic settings UI and options page foundation

import type { Settings, ExportFormat, createDefaultUserSettings } from '@/types';

console.log('Pocket-Prompt Options loaded');

// DOM elements
const themeSelect = document.getElementById('theme') as HTMLSelectElement;
const languageSelect = document.getElementById('language') as HTMLSelectElement;
const autoSaveToggle = document.getElementById('autoSave') as HTMLInputElement;
const searchFilteringToggle = document.getElementById('searchFiltering') as HTMLInputElement;
const aiSiteIntegrationToggle = document.getElementById('aiSiteIntegration') as HTMLInputElement;
const syncEnabledToggle = document.getElementById('syncEnabled') as HTMLInputElement;
const autoTagToggle = document.getElementById('autoTag') as HTMLInputElement;
const exportFormatSelect = document.getElementById('exportFormat') as HTMLSelectElement;
const captureShortcutInput = document.getElementById('captureShortcut') as HTMLInputElement;
const toggleShortcutInput = document.getElementById('toggleShortcut') as HTMLInputElement;

// Data management buttons
const exportSettingsBtn = document.getElementById('exportSettings') as HTMLButtonElement;
const importSettingsBtn = document.getElementById('importSettings') as HTMLButtonElement;
const exportDataBtn = document.getElementById('exportData') as HTMLButtonElement;
const importDataBtn = document.getElementById('importData') as HTMLButtonElement;
const resetSettingsBtn = document.getElementById('resetSettings') as HTMLButtonElement;

// Status message
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;

// Settings instance
let currentSettings: Settings;

// Initialize options page
document.addEventListener('DOMContentLoaded', initializeOptions);

async function initializeOptions(): Promise<void> {
  console.log('Initializing options...');

  try {
    await loadSettings();
    setupEventListeners();
    showStatus('Settings loaded successfully', 'success');
  } catch (error) {
    console.error('Failed to initialize options:', error);
    showStatus('Failed to initialize settings', 'error');
  }
}

async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['settings']);
    currentSettings = result.settings || getDefaultSettings();

    // Update UI with current settings
    updateUIFromSettings(currentSettings);

    console.log('Settings loaded:', currentSettings);
  } catch (error) {
    console.error('Failed to load settings:', error);
    throw error;
  }
}

function updateUIFromSettings(settings: Settings): void {
  themeSelect.value = settings.theme;
  autoSaveToggle.checked = settings.autoSave;
  syncEnabledToggle.checked = settings.syncEnabled;
  autoTagToggle.checked = settings.autoTag;
  exportFormatSelect.value = settings.exportFormat;
  captureShortcutInput.value = settings.shortcuts.capture;
  toggleShortcutInput.value = settings.shortcuts.toggle;
  
  // Set default language to Japanese if not specified
  languageSelect.value = 'ja'; // Static for now, can be extended later
  searchFilteringToggle.checked = true; // Default enabled
  aiSiteIntegrationToggle.checked = true; // Default enabled
}

function setupEventListeners(): void {
  // Basic settings
  themeSelect.addEventListener('change', handleSettingsChange);
  languageSelect.addEventListener('change', handleSettingsChange);
  
  // Feature toggles
  autoSaveToggle.addEventListener('change', handleSettingsChange);
  searchFilteringToggle.addEventListener('change', handleSettingsChange);
  aiSiteIntegrationToggle.addEventListener('change', handleSettingsChange);
  syncEnabledToggle.addEventListener('change', handleSettingsChange);
  autoTagToggle.addEventListener('change', handleSettingsChange);
  
  // Export settings
  exportFormatSelect.addEventListener('change', handleSettingsChange);
  
  // Data management buttons
  exportSettingsBtn.addEventListener('click', handleExportSettings);
  importSettingsBtn.addEventListener('click', handleImportSettings);
  exportDataBtn.addEventListener('click', handleExportData);
  importDataBtn.addEventListener('click', handleImportData);
  resetSettingsBtn.addEventListener('click', handleResetSettings);
}

async function handleSettingsChange(): Promise<void> {
  try {
    // Update settings object
    currentSettings = {
      theme: themeSelect.value as Settings['theme'],
      autoSave: autoSaveToggle.checked,
      syncEnabled: syncEnabledToggle.checked,
      autoTag: autoTagToggle.checked,
      exportFormat: exportFormatSelect.value as ExportFormat,
      shortcuts: {
        capture: captureShortcutInput.value,
        toggle: toggleShortcutInput.value,
      },
    };

    await saveSettings();
    showStatus('Settings saved automatically', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

async function saveSettings(): Promise<void> {
  try {
    await chrome.storage.local.set({ settings: currentSettings });
    console.log('Settings saved:', currentSettings);
    
    // Apply theme change immediately
    applyTheme(currentSettings.theme);
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

function applyTheme(theme: Settings['theme']): void {
  // Apply theme to the options page itself
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark', 'theme-auto', 'theme-system');
  body.classList.add(`theme-${theme}`);
  
  // For 'auto' and 'system', detect system preference
  if (theme === 'auto' || theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
  }
}

// Data Management Functions
async function handleExportSettings(): Promise<void> {
  try {
    showStatus('Exporting settings...', 'info');
    
    const exportData = {
      settings: currentSettings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    downloadJSON(exportData, `pocket-prompt-settings-${Date.now()}.json`);
    showStatus('Settings exported successfully', 'success');
  } catch (error) {
    console.error('Failed to export settings:', error);
    showStatus('Failed to export settings', 'error');
  }
}

async function handleImportSettings(): Promise<void> {
  try {
    const file = await selectFile('.json');
    const content = await readFileAsText(file);
    const importData = JSON.parse(content);
    
    if (importData.settings && isValidSettings(importData.settings)) {
      currentSettings = importData.settings;
      updateUIFromSettings(currentSettings);
      await saveSettings();
      showStatus('Settings imported successfully', 'success');
    } else {
      throw new Error('Invalid settings file format');
    }
  } catch (error) {
    console.error('Failed to import settings:', error);
    showStatus('Failed to import settings - invalid file format', 'error');
  }
}

async function handleExportData(): Promise<void> {
  try {
    showStatus('Exporting all data...', 'info');
    
    const result = await chrome.storage.local.get(null);
    const exportData = {
      ...result,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    downloadJSON(exportData, `pocket-prompt-data-${Date.now()}.json`);
    showStatus('All data exported successfully', 'success');
  } catch (error) {
    console.error('Failed to export data:', error);
    showStatus('Failed to export data', 'error');
  }
}

async function handleImportData(): Promise<void> {
  try {
    const confirmed = confirm('This will replace all existing data. Are you sure you want to continue?');
    if (!confirmed) return;
    
    const file = await selectFile('.json');
    const content = await readFileAsText(file);
    const importData = JSON.parse(content);
    
    // Clear existing data
    await chrome.storage.local.clear();
    
    // Import new data (excluding metadata)
    const { exportedAt, version, ...dataToImport } = importData;
    await chrome.storage.local.set(dataToImport);
    
    // Reload settings
    await loadSettings();
    showStatus('All data imported successfully', 'success');
  } catch (error) {
    console.error('Failed to import data:', error);
    showStatus('Failed to import data - invalid file format', 'error');
  }
}

async function handleResetSettings(): Promise<void> {
  try {
    const confirmed = confirm('This will reset all settings to defaults. Are you sure?');
    if (!confirmed) return;
    
    currentSettings = getDefaultSettings();
    updateUIFromSettings(currentSettings);
    await saveSettings();
    showStatus('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus('Failed to reset settings', 'error');
  }
}

// Utility Functions
function getDefaultSettings(): Settings {
  return {
    theme: 'auto',
    autoSave: true,
    syncEnabled: false, // Default to false for privacy
    autoTag: true,
    exportFormat: 'markdown',
    shortcuts: {
      capture: 'Alt+Shift+C',
      toggle: 'Alt+Shift+P',
    },
  };
}

function isValidSettings(obj: any): obj is Settings {
  return obj &&
    typeof obj.theme === 'string' &&
    typeof obj.autoSave === 'boolean' &&
    typeof obj.syncEnabled === 'boolean' &&
    typeof obj.autoTag === 'boolean' &&
    typeof obj.exportFormat === 'string' &&
    obj.shortcuts &&
    typeof obj.shortcuts.capture === 'string' &&
    typeof obj.shortcuts.toggle === 'string';
}

function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Auto-hide success and info messages
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 3000);
  }
}

function selectFile(accept: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    
    input.click();
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  // Apply system theme initially
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
});

// Export functions for testing
export {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  isValidSettings,
  applyTheme,
  handleExportSettings,
  handleImportSettings,
  handleExportData,
  handleImportData,
  handleResetSettings,
  handleSettingsChange,
  showStatus,
  selectFile,
};
