// Content script for Pocket-Prompt Chrome Extension
// TASK-0016: Content Script基盤・AIサイト検知
// Injected into AI sites (ChatGPT, Claude, Gemini)

import type { ChromeMessage, ChromeResponse, SupportedAISite } from '@/types';

console.log('Pocket-Prompt Content Script loaded on:', window.location.href);

// Detect which AI site we're on and initialize appropriate handler
const currentSite = detectAISite();

if (currentSite === 'chatgpt') {
  console.log('Initializing ChatGPT Content Script');
  // Import and initialize ChatGPT-specific content script
  import('./chatgpt-content-script').catch(error => {
    console.error('Failed to load ChatGPT content script:', error);
  });
} else if (currentSite) {
  console.log(`Detected AI site: ${currentSite} (basic handler)`);
  initializeBasicContentScript();
} else {
  console.log('Not on a supported AI site');
}

function detectAISite(): SupportedAISite | null {
  const hostname = window.location.hostname;

  // ChatGPT detection with comprehensive checks
  if (hostname === 'chat.openai.com' || 
      (hostname.includes('openai.com') && window.location.pathname.includes('chat'))) {
    return 'chatgpt';
  }

  // Claude.ai detection
  if (hostname.includes('claude.ai')) {
    return 'claude';
  }

  // Gemini detection
  if (hostname.includes('gemini.google.com')) {
    return 'gemini';
  }

  return null;
}

// Basic content script for non-ChatGPT AI sites (Claude, Gemini)
function initializeBasicContentScript(): void {
  chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
    console.log('Basic content script received message:', message.type);

    handleBasicMessage(message)
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

    return true; // Async response
  });

  console.log('Basic content script initialized for', currentSite);
}

async function handleBasicMessage(message: ChromeMessage): Promise<ChromeResponse> {
  const { type, requestId } = message;

  switch (type) {
    case 'GET_PAGE_INFO':
      return {
        success: true,
        data: {
          site: currentSite,
          url: window.location.href,
          title: document.title,
          ready: true,
        },
        timestamp: new Date(),
        requestId,
      };

    case 'EXPORT_CONVERSATION':
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: `Conversation export for ${currentSite} will be implemented in future tasks`,
        },
        timestamp: new Date(),
        requestId,
      };

    case 'INSERT_TEXT':
      // Basic text insertion for non-ChatGPT sites
      const success = await insertTextBasic(message.data as string);
      return {
        success,
        data: { inserted: success },
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

// Basic text insertion for Claude and Gemini
async function insertTextBasic(text: string): Promise<boolean> {
  try {
    // Common selectors for AI chat inputs
    const selectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="type"]',
      'textarea[placeholder*="prompt"]',
      '[contenteditable="true"]',
      'textarea',
    ];

    let inputElement: HTMLElement | null = null;
    
    for (const selector of selectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) break;
    }

    if (!inputElement) {
      console.warn('No input element found for text insertion');
      return false;
    }

    if (inputElement instanceof HTMLTextAreaElement) {
      inputElement.value = text;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (inputElement.contentEditable === 'true') {
      inputElement.textContent = text;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }

    inputElement.focus();
    return true;
  } catch (error) {
    console.error('Failed to insert text:', error);
    return false;
  }
}
