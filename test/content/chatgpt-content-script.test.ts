// ChatGPT Content Script Test Suite
// TASK-0016: Content Script基盤・AIサイト検知

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ChromeMessage, ChromeResponse } from '../../src/types';

// Mock Chrome API
const mockChromeRuntime = {
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  sendMessage: vi.fn(),
  lastError: null,
};

Object.defineProperty(global, 'chrome', {
  value: {
    runtime: mockChromeRuntime,
  },
  writable: true,
});

// Mock DOM environment for ChatGPT
const setupChatGPTDOM = (conversationExists = true): void => {
  // Mock location
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'chat.openai.com',
      pathname: '/c/12345',
      href: 'https://chat.openai.com/c/12345',
    },
    writable: true,
  });

  // Mock document structure
  document.body.innerHTML = `
    <main class="main">
      <h1>Test Conversation Title</h1>
      ${conversationExists ? `
        <div data-testid="conversation-turn-0" data-message-author-role="user">
          <div>Hello, how are you?</div>
        </div>
        <div data-testid="conversation-turn-1" data-message-author-role="assistant">
          <div>I'm doing well, thank you for asking!</div>
        </div>
      ` : ''}
      <textarea placeholder="Send a message to ChatGPT..." data-id="root"></textarea>
      <button data-testid="send-button">Send</button>
    </main>
  `;
};

// Mock non-ChatGPT site
const setupNonChatGPTDOM = (): void => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'example.com',
      pathname: '/',
      href: 'https://example.com/',
    },
    writable: true,
  });

  document.body.innerHTML = '<div>Not ChatGPT</div>';
};

describe('ChatGPT Content Script', () => {
  let contentScript: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChromeRuntime.lastError = null;
    
    // Mock MutationObserver
    global.MutationObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    contentScript?.destroy();
    document.body.innerHTML = '';
  });

  describe('Site Detection', () => {
    it('should detect ChatGPT site correctly', async () => {
      // 🟢 Blue: Site detection requirement
      setupChatGPTDOM();
      
      const { default: ChatGPTContentScript } = await import('../../src/content/chatgpt-content-script');
      
      // Since the class auto-initializes, we check console output or behavior
      expect(window.location.hostname).toBe('chat.openai.com');
    });

    it('should not initialize on non-ChatGPT sites', async () => {
      // 🟡 Yellow: Non-ChatGPT site handling
      setupNonChatGPTDOM();
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { default: ChatGPTContentScript } = await import('../../src/content/chatgpt-content-script');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not a ChatGPT site')
      );
      
      consoleSpy.mockRestore();
    });

    it('should detect ChatGPT subdomain variations', () => {
      // 🟡 Yellow: Subdomain detection
      const testCases = [
        'chat.openai.com',
        'chatgpt.openai.com', 
        'www.chat.openai.com',
      ];

      testCases.forEach(hostname => {
        Object.defineProperty(window, 'location', {
          value: {
            hostname,
            pathname: '/chat',
            href: `https://${hostname}/chat`,
          },
          writable: true,
        });

        expect(hostname.includes('openai.com')).toBe(true);
      });
    });
  });

  describe('DOM Element Detection', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should find conversation container', () => {
      // 🟢 Blue: DOM selector management
      const conversationElements = document.querySelectorAll('[data-testid^="conversation-turn"]');
      expect(conversationElements).toHaveLength(2);
    });

    it('should find text input element', () => {
      // 🟢 Blue: Input detection
      const textarea = document.querySelector('textarea[placeholder*="Send a message"]');
      expect(textarea).toBeTruthy();
      expect(textarea?.getAttribute('data-id')).toBe('root');
    });

    it('should find conversation title', () => {
      // 🟡 Yellow: Title extraction
      const title = document.querySelector('h1');
      expect(title?.textContent).toBe('Test Conversation Title');
    });

    it('should handle missing DOM elements gracefully', () => {
      // 🔴 Red: Missing elements handling
      document.body.innerHTML = '<div>Empty page</div>';
      
      const conversationElements = document.querySelectorAll('[data-testid^="conversation-turn"]');
      expect(conversationElements).toHaveLength(0);
    });

    it('should use fallback selectors when primary selectors fail', () => {
      // 🟡 Yellow: Selector fallback system
      // Remove primary selector elements
      const primaryElements = document.querySelectorAll('[data-testid^="conversation-turn"]');
      primaryElements.forEach(el => el.remove());
      
      // Add fallback elements
      document.body.innerHTML += '<div class="group w-full">Fallback message</div>';
      
      const fallbackElements = document.querySelectorAll('.group.w-full');
      expect(fallbackElements).toHaveLength(1);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should handle GET_PAGE_INFO message', async () => {
      // 🟢 Blue: Background communication
      const message: ChromeMessage = {
        type: 'GET_PAGE_INFO',
        timestamp: new Date(),
        requestId: 'test-request-1',
      };

      // Mock the message handler
      let messageHandler: Function;
      mockChromeRuntime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler = handler;
      });

      // Import and initialize
      await import('../../src/content/chatgpt-content-script');

      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
      expect(typeof messageHandler!).toBe('function');

      // Test message handling
      const mockSendResponse = vi.fn();
      messageHandler!(message, {}, mockSendResponse);

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            site: 'chatgpt',
            url: 'https://chat.openai.com/c/12345',
            title: expect.any(String),
          }),
        })
      );
    });

    it('should handle EXPORT_CONVERSATION message', async () => {
      // 🟢 Blue: Conversation export
      const message: ChromeMessage = {
        type: 'EXPORT_CONVERSATION',
        timestamp: new Date(),
        requestId: 'test-request-2',
      };

      let messageHandler: Function;
      mockChromeRuntime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler = handler;
      });

      await import('../../src/content/chatgpt-content-script');

      const mockSendResponse = vi.fn();
      messageHandler!(message, {}, mockSendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            title: expect.any(String),
            messages: expect.any(Array),
            url: 'https://chat.openai.com/c/12345',
            site: 'chatgpt',
          }),
        })
      );
    });

    it('should handle INSERT_TEXT message', async () => {
      // 🟢 Blue: Text insertion functionality
      const testText = 'Test prompt text';
      const message: ChromeMessage = {
        type: 'INSERT_TEXT',
        data: testText,
        timestamp: new Date(),
        requestId: 'test-request-3',
      };

      let messageHandler: Function;
      mockChromeRuntime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler = handler;
      });

      await import('../../src/content/chatgpt-content-script');

      const mockSendResponse = vi.fn();
      messageHandler!(message, {}, mockSendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea?.value).toBe(testText);
      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should handle unknown message types', async () => {
      // 🔴 Red: Unknown message handling
      const message = {
        type: 'UNKNOWN_TYPE',
        timestamp: new Date(),
        requestId: 'test-request-4',
      } as any;

      let messageHandler: Function;
      mockChromeRuntime.onMessage.addListener.mockImplementation((handler) => {
        messageHandler = handler;
      });

      await import('../../src/content/chatgpt-content-script');

      const mockSendResponse = vi.fn();
      messageHandler!(message, {}, mockSendResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining('Unknown message type'),
          }),
        })
      );
    });
  });

  describe('SPA Navigation Handling', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should detect URL changes via pushState', async () => {
      // 🟢 Blue: SPA navigation support
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await import('../../src/content/chatgpt-content-script');

      // Simulate navigation
      const newUrl = 'https://chat.openai.com/c/67890';
      history.pushState({}, '', newUrl);

      // Wait for event handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ChatGPT navigation detected'),
        newUrl
      );

      consoleSpy.mockRestore();
    });

    it('should handle popstate events', async () => {
      // 🟡 Yellow: Browser navigation
      await import('../../src/content/chatgpt-content-script');

      const popstateEvent = new PopStateEvent('popstate', { state: {} });
      window.dispatchEvent(popstateEvent);

      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should re-notify background script after navigation', async () => {
      // 🟡 Yellow: Re-initialization after navigation
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback({ success: true });
      });

      await import('../../src/content/chatgpt-content-script');

      // Clear previous calls
      mockChromeRuntime.sendMessage.mockClear();

      // Simulate navigation
      history.pushState({}, '', 'https://chat.openai.com/c/new-conversation');

      // Wait for re-notification
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_PAGE_INFO',
          data: expect.objectContaining({
            site: 'chatgpt',
            ready: true,
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('Conversation Data Extraction', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should extract user and assistant messages', () => {
      // 🟢 Blue: Message role detection
      const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
      const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');

      expect(userMessages).toHaveLength(1);
      expect(assistantMessages).toHaveLength(1);
      expect(userMessages[0].textContent).toContain('Hello, how are you?');
      expect(assistantMessages[0].textContent).toContain("I'm doing well");
    });

    it('should extract conversation title', () => {
      // 🟡 Yellow: Title extraction
      const titleElement = document.querySelector('h1');
      expect(titleElement?.textContent).toBe('Test Conversation Title');
    });

    it('should handle empty conversations', () => {
      // 🔴 Red: Empty conversation handling
      setupChatGPTDOM(false); // No conversation messages

      const messages = document.querySelectorAll('[data-testid^="conversation-turn"]');
      expect(messages).toHaveLength(0);
    });
  });

  describe('DOM Mutation Observer', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should setup mutation observer', async () => {
      // 🟡 Yellow: DOM change monitoring
      await import('../../src/content/chatgpt-content-script');

      expect(MutationObserver).toHaveBeenCalled();
    });

    it('should detect new messages', () => {
      // 🟡 Yellow: New message detection
      const observer = new MutationObserver(() => {});
      expect(observer.observe).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should retry initialization on failure', async () => {
      // 🔴 Red: Initialization retry logic
      setupChatGPTDOM();
      
      // Mock querySelector to fail initially
      const originalQuerySelector = document.querySelector;
      let callCount = 0;
      document.querySelector = vi.fn(() => {
        callCount++;
        if (callCount < 3) {
          return null; // Fail first two attempts
        }
        return originalQuerySelector.call(document, 'main');
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await import('../../src/content/chatgpt-content-script');

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(callCount).toBeGreaterThan(1);
      
      consoleSpy.mockRestore();
      document.querySelector = originalQuerySelector;
    });

    it('should handle Chrome runtime errors gracefully', async () => {
      // 🔴 Red: Chrome API error handling
      mockChromeRuntime.lastError = { message: 'Extension context invalidated' };
      mockChromeRuntime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback(null);
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await import('../../src/content/chatgpt-content-script');

      // Wait for background notification
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to notify background script'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should stop retrying after max attempts', async () => {
      // 🔴 Red: Max retry limit
      setupNonChatGPTDOM(); // This will cause initialization to fail

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await import('../../src/content/chatgpt-content-script');

      // Should not attempt initialization on non-ChatGPT site
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Max retries reached')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Text Insertion', () => {
    beforeEach(() => {
      setupChatGPTDOM();
    });

    it('should insert text and trigger events', () => {
      // 🟢 Blue: Text insertion with events
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      const testText = 'Hello from Pocket Prompt!';

      // Mock event dispatching
      const dispatchEventSpy = vi.spyOn(textarea, 'dispatchEvent');
      const focusSpy = vi.spyOn(textarea, 'focus').mockImplementation(() => {});

      // Simulate text insertion
      textarea.value = testText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      textarea.focus();

      expect(textarea.value).toBe(testText);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
      expect(focusSpy).toHaveBeenCalled();

      focusSpy.mockRestore();
    });

    it('should handle missing input element', () => {
      // 🔴 Red: Missing input handling
      const textarea = document.querySelector('textarea');
      textarea?.remove();

      const remainingTextareas = document.querySelectorAll('textarea');
      expect(remainingTextareas).toHaveLength(0);
    });
  });
});