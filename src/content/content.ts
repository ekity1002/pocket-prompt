// Content script for Pocket Prompt Chrome Extension
// Runs on web pages to interact with page content

console.log('Pocket Prompt content script loaded');

// Types for content script functionality
interface PromptData {
  title: string;
  content: string;
  url: string;
  timestamp: number;
}

// Initialize content script
function initializeContentScript() {
  console.log('Initializing Pocket Prompt on:', window.location.href);

  // Add event listeners for prompt detection and capture
  document.addEventListener('selectionchange', handleTextSelection);

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    switch (request.action) {
      case 'getPageContent':
        sendResponse({
          success: true,
          data: {
            title: document.title,
            url: window.location.href,
            selectedText: window.getSelection()?.toString() || '',
          },
        });
        break;

      case 'capturePrompt':
        handleCapturePrompt()
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Indicates async response

      default:
        console.warn('Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });
}

// Handle text selection for prompt detection
function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const selectedText = selection.toString().trim();
  if (selectedText.length > 10) {
    console.log('Text selected:', selectedText.substring(0, 100) + '...');
    // Could show a floating prompt capture button here
  }
}

// Capture prompt from current page
async function handleCapturePrompt(): Promise<PromptData> {
  const selectedText = window.getSelection()?.toString() || '';
  const pageTitle = document.title;
  const currentUrl = window.location.href;

  const promptData: PromptData = {
    title: selectedText ? `Selected from: ${pageTitle}` : pageTitle,
    content: selectedText || extractMainContent(),
    url: currentUrl,
    timestamp: Date.now(),
  };

  // Send to background script for storage
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'savePrompt', data: promptData }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

// Extract main content from page (simplified implementation)
function extractMainContent(): string {
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const content = document.querySelector('.content, #content, .post-content');

  const target = article || main || content || document.body;

  // Get text content, removing scripts and styles
  const clone = target.cloneNode(true) as HTMLElement;
  const scripts = clone.querySelectorAll('script, style, nav, header, footer');
  scripts.forEach((el) => el.remove());

  return clone.textContent?.trim() || '';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

export {};
