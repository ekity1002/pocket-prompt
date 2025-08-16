// ChatGPT Content Script for Pocket Prompt Chrome Extension
// TASK-0016: Content Script基盤・AIサイト検知

import type { ChromeMessage, ChromeResponse, SupportedAISite } from '@/types';

console.log('ChatGPT Content Script loaded');

// ChatGPT site configuration
const CHATGPT_CONFIG = {
  site: 'chatgpt' as SupportedAISite,
  domain: 'chatgpt.com',
  selectors: {
    // Main conversation container
    conversationContainer: '[data-testid^="conversation-turn"]',
    conversationMain: 'main[class*="main"]',

    // Message elements (with fallbacks for UI updates)
    messages: [
      '[data-testid^="conversation-turn"]',
      '.group.w-full',
      '[data-message-author-role]',
      '.prose', // Fallback selector
    ],

    // User and assistant message indicators
    userMessage: [
      '[data-message-author-role="user"]',
      '[data-testid="user-message"]',
      '.group.w-full:has(.whitespace-pre-wrap)',
    ],

    assistantMessage: [
      '[data-message-author-role="assistant"]',
      '[data-testid="assistant-message"]',
      '.group.w-full:has(.markdown)',
    ],

    // Text input area
    textInput: [
      'textarea[placeholder*="Send a message"]',
      'textarea[data-id="root"]',
      '#prompt-textarea',
      'textarea', // Ultimate fallback
    ],

    // Conversation title
    conversationTitle: ['h1', '[data-testid="conversation-title"]', '.text-2xl'],

    // Send button
    sendButton: [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button:has(svg)',
    ],
  },
} as const;

// Content script state
class ChatGPTContentScript {
  private isInitialized = false;
  private observer: MutationObserver | null = null;
  private lastUrl = '';
  private retryCount = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 1000;

  constructor() {
    this.initialize();
  }

  // Main initialization
  private async initialize(): Promise<void> {
    try {
      console.log('Initializing ChatGPT Content Script');

      // Verify we're on ChatGPT
      if (!this.isChatGPTSite()) {
        console.warn('Not a ChatGPT site, content script will not activate');
        return;
      }

      await this.waitForPageReady();
      this.setupBackgroundCommunication();
      this.setupSPANavigation();
      this.setupDOMObserver();
      this.notifyBackgroundScriptReady();

      this.isInitialized = true;
      console.log('ChatGPT Content Script initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChatGPT Content Script:', error);
      this.scheduleRetry();
    }
  }

  // Site detection logic
  private isChatGPTSite(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // Primary check: exact domain match
    if (hostname === CHATGPT_CONFIG.domain || hostname === 'chat.openai.com') {
      return true;
    }

    // Fallback checks for subdomains or redirects
    if (hostname.includes('openai.com') && pathname.includes('chat')) {
      return true;
    }

    // Additional check for chat-related URLs
    if (hostname.includes('chat') && hostname.includes('openai')) {
      return true;
    }

    return false;
  }

  // Wait for page to be fully loaded
  private async waitForPageReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('Page ready timeout - proceeding anyway');
        resolve(); // Resolve instead of reject to continue initialization
      }, 5000); // Reduced timeout to 5 seconds

      const checkReady = (): void => {
        // Check if main conversation area exists or if page is complete
        const mainElement = this.findElement(CHATGPT_CONFIG.selectors.conversationMain);
        const hasMessages = this.findElement(CHATGPT_CONFIG.selectors.messages[0]);
        const hasAnyMain = document.querySelector('main');

        console.log('DEBUG: Page ready check:', {
          mainElement: !!mainElement,
          hasMessages: !!hasMessages,
          hasAnyMain: !!hasAnyMain,
          readyState: document.readyState,
        });

        // More lenient conditions - just need a main element or complete state
        if (hasAnyMain || document.readyState === 'complete') {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 500);
        }
      };

      // Start checking
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkReady);
      } else {
        checkReady();
      }
    });
  }

  // Setup communication with background script
  private setupBackgroundCommunication(): void {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) =>
          sendResponse({
            success: false,
            error: { code: 'CONTENT_SCRIPT_ERROR', message: error.message },
            timestamp: new Date(),
            requestId: message.requestId,
          })
        );

      return true; // Keep the message channel open for async response
    });
  }

  // Handle messages from background script
  private async handleMessage(message: ChromeMessage): Promise<ChromeResponse> {
    console.log('Content script received message:', message);

    switch (message.type) {
      case 'GET_PAGE_INFO':
        return {
          success: true,
          data: {
            site: CHATGPT_CONFIG.site,
            url: window.location.href,
            title: this.getConversationTitle(),
            isReady: this.isInitialized,
          },
          timestamp: new Date(),
          requestId: message.requestId,
        };

      case 'EXPORT_CONVERSATION':
        const conversationData = await this.extractConversationData();
        return {
          success: true,
          data: conversationData,
          timestamp: new Date(),
          requestId: message.requestId,
        };

      case 'INSERT_TEXT':
        const insertResult = await this.insertTextToInput(message.data as string);
        return {
          success: insertResult,
          timestamp: new Date(),
          requestId: message.requestId,
        };

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  // Setup SPA navigation handling
  private setupSPANavigation(): void {
    this.lastUrl = window.location.href;

    // Listen for URL changes (pushState/popState)
    window.addEventListener('popstate', () => {
      this.handleNavigationChange();
    });

    // Monitor URL changes via pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new Event('locationchange'));
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new Event('locationchange'));
    };

    window.addEventListener('locationchange', () => {
      this.handleNavigationChange();
    });
  }

  // Handle navigation changes
  private handleNavigationChange(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      console.log('ChatGPT navigation detected:', currentUrl);
      this.lastUrl = currentUrl;

      // Re-initialize for new conversation
      setTimeout(() => {
        this.notifyBackgroundScriptReady();
      }, 1000);
    }
  }

  // Setup DOM mutation observer
  private setupDOMObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldNotify = false;

      mutations.forEach((mutation) => {
        // Check for new messages
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasNewMessage = addedNodes.some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              this.matchesAnySelector(node as Element, CHATGPT_CONFIG.selectors.messages)
          );

          if (hasNewMessage) {
            shouldNotify = true;
          }
        }
      });

      if (shouldNotify) {
        this.notifyConversationUpdate();
      }
    });

    const targetElement =
      this.findElement(CHATGPT_CONFIG.selectors.conversationMain) || document.body;
    this.observer.observe(targetElement, {
      childList: true,
      subtree: true,
    });
  }

  // Utility: Find element with multiple selector fallbacks
  private findElement(selectors: string | string[]): Element | null {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorList) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }

    return null;
  }

  // Utility: Check if element matches any selector
  private matchesAnySelector(element: Element, selectors: string[]): boolean {
    return selectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  }

  // Extract conversation title
  private getConversationTitle(): string {
    const titleElement = this.findElement(CHATGPT_CONFIG.selectors.conversationTitle);
    return titleElement?.textContent?.trim() || 'ChatGPT Conversation';
  }

  // Extract conversation data for export using enhanced parser
  private async extractConversationData(): Promise<any> {
    console.log('Starting conversation data extraction...');
    
    // Use basic extraction (enhanced parser has import issues in content script)
    const messages = document.querySelectorAll(CHATGPT_CONFIG.selectors.messages[0]);
    const conversationTitle = this.getConversationTitle();

    console.log('Found messages:', messages.length);

    const messageData = Array.from(messages)
      .map((messageElement, index) => {
        const isUser = this.matchesAnySelector(
          messageElement,
          CHATGPT_CONFIG.selectors.userMessage
        );
        const isAssistant = this.matchesAnySelector(
          messageElement,
          CHATGPT_CONFIG.selectors.assistantMessage
        );

        // Check for data-message-author-role attribute
        const authorRole = messageElement.getAttribute('data-message-author-role');
        
        // More robust role detection
        let role: string;
        if (authorRole === 'user') {
          role = 'user';
        } else if (authorRole === 'assistant') {
          role = 'assistant';
        } else if (isUser) {
          role = 'user';
        } else if (isAssistant) {
          role = 'assistant';
        } else {
          // Fallback: alternate between user and assistant starting with user
          role = index % 2 === 0 ? 'user' : 'assistant';
        }

        const content = messageElement.textContent?.trim() || '';

        // Debug logging
        console.log(`Message ${index}: role=${role}, isUser=${isUser}, isAssistant=${isAssistant}, authorRole=${authorRole}`);

        return {
          role,
          content,
          timestamp: new Date().toISOString(),
        };
      })
      .filter((msg) => msg.content.length > 0);

    console.log('Extracted message data:', messageData.length, 'messages');

    const result = {
      title: conversationTitle,
      messages: messageData,
      url: window.location.href,
      site: CHATGPT_CONFIG.site,
      extractedAt: new Date().toISOString(),
    };

    console.log('Final conversation data:', result);
    return result;
  }

  // Insert text into ChatGPT input
  private async insertTextToInput(text: string): Promise<boolean> {
    try {
      const inputElement = this.findElement(
        [...CHATGPT_CONFIG.selectors.textInput]
      ) as HTMLTextAreaElement;

      if (!inputElement) {
        throw new Error('ChatGPT input element not found');
      }

      // Set the value
      inputElement.value = text;
      inputElement.textContent = text;

      // Trigger input events to notify ChatGPT
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      // Focus the input
      inputElement.focus();

      return true;
    } catch (error) {
      console.error('Failed to insert text:', error);
      return false;
    }
  }

  // Notify background script that content script is ready
  private notifyBackgroundScriptReady(): void {
    const message: ChromeMessage = {
      type: 'GET_PAGE_INFO',
      data: {
        site: CHATGPT_CONFIG.site,
        url: window.location.href,
        title: this.getConversationTitle(),
        ready: true,
      },
      timestamp: new Date(),
      requestId: `content-${Date.now()}`,
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to notify background script:', chrome.runtime.lastError);
      } else {
        console.log('Background script notified successfully');
      }
    });
  }

  // Notify background script of conversation updates
  private notifyConversationUpdate(): void {
    const message: ChromeMessage = {
      type: 'SYNC_DATA',
      data: {
        site: CHATGPT_CONFIG.site,
        event: 'conversation_updated',
        url: window.location.href,
      },
      timestamp: new Date(),
      requestId: `update-${Date.now()}`,
    };

    chrome.runtime.sendMessage(message);
  }

  // Retry initialization on failure
  private scheduleRetry(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(
        `Retrying ChatGPT Content Script initialization (${this.retryCount}/${this.maxRetries})`
      );

      setTimeout(() => {
        this.initialize();
      }, this.retryDelay * this.retryCount);
    } else {
      console.error('Max retries reached, ChatGPT Content Script failed to initialize');
    }
  }

  // Cleanup
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.isInitialized = false;
  }
}

// Content script instance
let contentScript: ChatGPTContentScript | null = null;

// Export initialization function for dynamic import
export async function initializeChatGPTHandler(): Promise<void> {
  if (contentScript) {
    console.log('ChatGPT Content Script already initialized');
    return;
  }

  console.log('Initializing ChatGPT Content Script handler');

  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  contentScript = new ChatGPTContentScript();

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    contentScript?.destroy();
    contentScript = null;
  });
}
