// Options page script for Pocket-Prompt Chrome Extension

import type { UserSettings } from '@/types';

console.log('Pocket-Prompt Options loaded');

// DOM elements
const themeSelect = document.getElementById('theme') as HTMLSelectElement;
const languageSelect = document.getElementById('language') as HTMLSelectElement;
const tagManagementToggle = document.getElementById('tagManagement') as HTMLInputElement;
const searchFilteringToggle = document.getElementById('searchFiltering') as HTMLInputElement;
const aiSiteIntegrationToggle = document.getElementById('aiSiteIntegration') as HTMLInputElement;
const cloudSyncToggle = document.getElementById('cloudSync') as HTMLInputElement;

// Initialize options page
document.addEventListener('DOMContentLoaded', initializeOptions);

async function initializeOptions(): Promise<void> {
  console.log('Initializing options...');

  try {
    await loadSettings();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize options:', error);
  }
}

async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings: UserSettings = result.settings || getDefaultSettings();

    // Update UI with current settings
    themeSelect.value = settings.theme;
    languageSelect.value = settings.language;
    tagManagementToggle.checked = settings.features.tagManagement;
    searchFilteringToggle.checked = settings.features.searchFiltering;
    aiSiteIntegrationToggle.checked = settings.features.aiSiteIntegration;
    cloudSyncToggle.checked = settings.features.cloudSync;

    console.log('Settings loaded:', settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function setupEventListeners(): void {
  // Theme change
  themeSelect.addEventListener('change', saveSettings);
  languageSelect.addEventListener('change', saveSettings);

  // Feature toggles
  tagManagementToggle.addEventListener('change', saveSettings);
  searchFilteringToggle.addEventListener('change', saveSettings);
  aiSiteIntegrationToggle.addEventListener('change', saveSettings);
  cloudSyncToggle.addEventListener('change', saveSettings);
}

async function saveSettings(): Promise<void> {
  try {
    const settings: UserSettings = {
      theme: themeSelect.value as 'light' | 'dark' | 'auto',
      language: languageSelect.value as 'ja' | 'en',
      features: {
        tagManagement: tagManagementToggle.checked,
        searchFiltering: searchFilteringToggle.checked,
        aiSiteIntegration: aiSiteIntegrationToggle.checked,
        cloudSync: cloudSyncToggle.checked,
        multiAiSupport: false, // Will be implemented in Phase 3
      },
    };

    await chrome.storage.local.set({ settings });
    console.log('Settings saved:', settings);

    // Show feedback to user (optional)
    showSaveConfirmation();
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function getDefaultSettings(): UserSettings {
  return {
    theme: 'auto',
    language: 'ja',
    features: {
      tagManagement: false,
      searchFiltering: false,
      aiSiteIntegration: false,
      cloudSync: false,
      multiAiSupport: false,
    },
  };
}

function showSaveConfirmation(): void {
  console.log('Settings saved successfully');
  // TODO: Show temporary confirmation message
}
