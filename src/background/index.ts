// Background script for Pocket-Prompt Chrome Extension
// Manifest V3 Service Worker

import type { ChromeMessage, ChromeResponse } from '@/types';

console.log('Pocket-Prompt Background Script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Pocket-Prompt installed:', details.reason);

  // Initialize default settings on first install
  if (details.reason === 'install') {
    initializeDefaultSettings();
  }
});

// Handle messages from popup, options, and content scripts
chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
  console.log('Background received message:', message.type);

  // Handle async responses
  handleMessage(message, _sender)
    .then((response: ChromeResponse) => {
      sendResponse(response);
    })
    .catch((error: Error) => {
      sendResponse({
        success: false,
        error: {
          code: 'BACKGROUND_ERROR',
          message: error.message,
        },
        timestamp: new Date(),
        requestId: message.requestId,
      });
    });

  // Return true to indicate we'll respond asynchronously
  return true;
});

async function handleMessage(
  message: ChromeMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ChromeResponse> {
  const { type, requestId } = message;

  switch (type) {
    case 'GET_PROMPTS':
      return {
        success: true,
        data: { prompts: [], totalCount: 0 },
        timestamp: new Date(),
        requestId,
      };

    case 'SAVE_PROMPT':
      return {
        success: true,
        data: { saved: true },
        timestamp: new Date(),
        requestId,
      };

    default:
      return {
        success: false,
        error: {
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: ${type}`,
        },
        timestamp: new Date(),
        requestId,
      };
  }
}

async function initializeDefaultSettings(): Promise<void> {
  const defaultSettings = {
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

  await chrome.storage.local.set({
    settings: defaultSettings,
    metadata: {
      version: '0.1.0',
      dataSize: 0,
      encryptionEnabled: false,
    },
  });

  console.log('Default settings initialized');
}
