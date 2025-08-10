// Content script for Pocket-Prompt Chrome Extension
// Injected into AI sites (ChatGPT, Claude, Gemini)

import type { ChromeMessage, ChromeResponse } from '@/types';

console.log('Pocket-Prompt Content Script loaded on:', window.location.href);

// Detect which AI site we're on
const currentSite = detectAISite();

if (currentSite) {
  console.log(`Detected AI site: ${currentSite}`);
  initializeContentScript();
} else {
  console.log('Not on a supported AI site');
}

function detectAISite(): string | null {
  const hostname = window.location.hostname;

  if (hostname.includes('chat.openai.com')) {
    return 'chatgpt';
  }
  if (hostname.includes('claude.ai')) {
    return 'claude';
  }
  if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  }

  return null;
}

function initializeContentScript(): void {
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
    console.log('Content script received message:', message.type);

    handleMessage(message)
      .then((response: ChromeResponse) => {
        sendResponse(response);
      })
      .catch((error: Error) => {
        sendResponse({
          success: false,
          error: {
            code: 'CONTENT_SCRIPT_ERROR',
            message: error.message,
          },
          timestamp: new Date(),
          requestId: message.requestId,
        });
      });

    // Return true to indicate we'll respond asynchronously
    return true;
  });

  console.log('Content script initialized for', currentSite);
}

async function handleMessage(message: ChromeMessage): Promise<ChromeResponse> {
  const { type, requestId } = message;

  switch (type) {
    case 'GET_PAGE_INFO':
      return {
        success: true,
        data: {
          site: currentSite,
          url: window.location.href,
          title: document.title,
        },
        timestamp: new Date(),
        requestId,
      };

    case 'EXPORT_CONVERSATION':
      // TODO: Implement conversation export for current AI site
      return {
        success: true,
        data: { message: 'Export functionality will be implemented in next tasks' },
        timestamp: new Date(),
        requestId,
      };

    case 'INSERT_TEXT':
      // TODO: Implement text insertion into AI input field
      return {
        success: true,
        data: { message: 'Text insertion functionality will be implemented in next tasks' },
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
