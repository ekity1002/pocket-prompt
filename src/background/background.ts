// Background script for Pocket Prompt Chrome Extension
// Handles service worker functionality for Manifest V3

console.log('Pocket Prompt background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Pocket Prompt extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize default settings on first install
    chrome.storage.sync.set({
      settings: {
        theme: 'light',
        autoSave: true,
        syncEnabled: true,
      },
      prompts: [],
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'ping':
      sendResponse({ status: 'pong' });
      break;

    case 'savePrompt':
      handleSavePrompt(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response

    default:
      console.warn('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Helper function to save prompts
async function handleSavePrompt(promptData: any) {
  try {
    const result = await chrome.storage.sync.get(['prompts']);
    const prompts = result.prompts || [];

    const newPrompt = {
      id: Date.now().toString(),
      ...promptData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    prompts.push(newPrompt);
    await chrome.storage.sync.set({ prompts });

    return newPrompt;
  } catch (error) {
    console.error('Failed to save prompt:', error);
    throw error;
  }
}

export {};
