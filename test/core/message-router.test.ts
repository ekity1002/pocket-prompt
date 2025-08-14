import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import type {
  ChromeMessage,
  ChromeResponse,
  ChromeMessageType,
  GetPromptsRequest,
  SavePromptRequest,
  GetPageInfoRequest,
  InsertTextRequest,
} from '../../src/types';
import { MessageRouter, type MessageHandler } from '../../src/core/message-router';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    sendMessage: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Test utilities
const generateRequestId = () => `req-${Date.now()}-${Math.random()}`;

const createTestMessage = (
  type: ChromeMessageType,
  data: any = {},
  requestId?: string
): ChromeMessage => ({
  type,
  data,
  timestamp: new Date(),
  requestId: requestId || generateRequestId(),
  source: 'popup',
});

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;
  let mockPromptHandler: MessageHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock handlers
    mockPromptHandler = {
      handle: vi.fn().mockResolvedValue({
        success: true,
        data: { prompts: [] },
        requestId: 'test-123',
        messageType: 'GET_PROMPTS',
      }),
    };

    // Initialize real messageRouter
    messageRouter = new MessageRouter();
    messageRouter.addHandler('GET_PROMPTS', mockPromptHandler);
  });

  describe('Message Type Validation and Routing', () => {
    it('should route valid GET_PROMPTS message to prompt handler', async () => {
      // 🟢 Blue: Based on API endpoints documentation
      const message: GetPromptsRequest = {
        type: 'GET_PROMPTS',
        data: { query: { keyword: 'test' } },
        timestamp: new Date(),
        requestId: 'test-123',
        source: 'popup',
      };

      const result = await messageRouter.process(message);

      expect(result.success).toBe(true);
      expect(result.messageType).toBe('GET_PROMPTS');
      expect(result.requestId).toBe('test-123');
      expect(mockPromptHandler.handle).toHaveBeenCalledWith(message);
    });

    it('should reject message with invalid type', async () => {
      // 🟡 Yellow: Reasonable inference from validation requirements
      const message = {
        type: 'INVALID_MESSAGE_TYPE',
        data: {},
        timestamp: new Date(),
        requestId: 'test-123',
        source: 'popup',
      };

      const result = await messageRouter.process(message);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_MESSAGE_TYPE');
    });

    it('should reject message without required requestId', async () => {
      // 🟡 Yellow: Reasonable inference from message structure requirements
      const message = {
        type: 'GET_PROMPTS',
        data: {},
        timestamp: new Date(),
        source: 'popup',
        // requestId missing
      };

      const result = await messageRouter.process(message);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_REQUEST_DATA');
    });
  });

  describe('Background ↔ Popup Communication', () => {
    it('should successfully send GET_PROMPTS from popup to background', async () => {
      // 🟢 Blue: Direct API endpoint implementation
      const request: GetPromptsRequest = {
        type: 'GET_PROMPTS',
        data: { pagination: { page: 1, pageSize: 20 } },
        timestamp: new Date(),
        requestId: generateRequestId(),
        source: 'popup',
      };

      const mockResponse = {
        success: true,
        data: {
          prompts: [
            {
              id: 'test-1',
              title: 'Test Prompt',
              content: 'Test content',
              tags: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: { usageCount: 0, isFavorite: false },
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1 },
        },
        requestId: request.requestId,
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      const response = await chrome.runtime.sendMessage(request);

      expect(response.success).toBe(true);
      expect(response.data.prompts).toBeDefined();
      expect(response.requestId).toBe(request.requestId);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(request);
    });

    it('should process SAVE_PROMPT message and integrate with storage', async () => {
      // 🟢 Blue: Based on storage integration requirements
      const request: SavePromptRequest = {
        type: 'SAVE_PROMPT',
        data: {
          prompt: {
            title: 'Test Prompt',
            content: 'Test content',
            tags: ['test'],
          },
        },
        timestamp: new Date(),
        requestId: generateRequestId(),
        source: 'popup',
      };

      const mockStorageManager = {
        save: vi.fn().mockResolvedValue('generated-id'),
      };

      const backgroundMessageHandler = {
        process: vi.fn().mockResolvedValue({
          success: true,
          data: {
            prompt: {
              id: 'generated-id',
              title: 'Test Prompt',
              content: 'Test content',
              tags: ['test'],
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: { usageCount: 0, isFavorite: false },
            },
          },
          requestId: request.requestId,
        }),
      };

      const response = await backgroundMessageHandler.process(request);

      expect(response.success).toBe(true);
      expect(response.data.prompt.id).toBeDefined();
      expect(response.requestId).toBe(request.requestId);
    });
  });

  describe('Background ↔ Content Script Communication', () => {
    it('should successfully send GET_PAGE_INFO to content script', async () => {
      // 🟢 Blue: Based on content script API design
      const tabId = 123;
      const request: GetPageInfoRequest = {
        type: 'GET_PAGE_INFO',
        data: { detectAI: true, getInputElements: true },
        timestamp: new Date(),
        requestId: generateRequestId(),
        source: 'background',
      };

      const mockTabResponse = {
        success: true,
        data: {
          tabInfo: {
            url: 'https://chat.openai.com/',
            title: 'ChatGPT',
            isConversationPage: true,
          },
          isConversationPage: true,
          aiSite: 'chatgpt' as const,
        },
        requestId: request.requestId,
      };

      mockChrome.tabs.sendMessage.mockResolvedValue(mockTabResponse);

      const response = await chrome.tabs.sendMessage(tabId, request);

      expect(response.success).toBe(true);
      expect(response.data.tabInfo).toBeDefined();
      expect(response.data.isConversationPage).toBeDefined();
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, request);
    });

    it('should handle content script not available error', async () => {
      // 🟡 Yellow: Error handling inference from Chrome API behavior
      const tabId = 999; // Non-existent tab
      const request: InsertTextRequest = {
        type: 'INSERT_TEXT',
        data: { text: 'Test prompt', options: { replace: true } },
        timestamp: new Date(),
        requestId: generateRequestId(),
        source: 'background',
      };

      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));

      const backgroundMessageHandler = {
        sendToContentScript: vi.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'CONTENT_SCRIPT_NOT_AVAILABLE',
            message: 'Content script is not available on this tab',
          },
          requestId: request.requestId,
        }),
      };

      const response = await backgroundMessageHandler.sendToContentScript(tabId, request);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('CONTENT_SCRIPT_NOT_AVAILABLE');
    });
  });
});
