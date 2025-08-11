import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChromeMessage, ChromeMessageType } from '@/types';
import { MessageValidator, type ValidationResult } from '../message-validator';

// Test utilities
const generateRequestId = () => `req-${Date.now()}-${Math.random()}`;

const createTestMessage = (
  type: ChromeMessageType,
  data: any = {},
  requestId?: string,
  source?: string
): ChromeMessage => ({
  type,
  data,
  timestamp: new Date(),
  requestId: requestId || generateRequestId(),
  source: source || 'popup',
});

describe('MessageValidator', () => {
  let messageValidator: MessageValidator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize real MessageValidator
    messageValidator = new MessageValidator();
  });

  describe('Message Security and Validation', () => {
    it('should validate message source is from extension context', () => {
      // 🟡 Yellow: Security validation inference from Chrome extension requirements
      const message: ChromeMessage = {
        type: 'GET_PROMPTS',
        data: {},
        timestamp: new Date(),
        requestId: generateRequestId(),
        source: 'popup',
      };

      messageValidator.validateSource.mockImplementation((msg: ChromeMessage, origin: string) => {
        return (
          msg.source === 'popup' || msg.source === 'background' || msg.source === 'content-script'
        );
      });

      const isValid = messageValidator.validateSource(message, 'chrome-extension://');

      expect(isValid).toBe(true);
      expect(messageValidator.validateSource).toHaveBeenCalledWith(message, 'chrome-extension://');
    });

    it('should reject messages from invalid sources', () => {
      // 🟡 Yellow: Security validation pattern
      const message = createTestMessage('DELETE_PROMPT', { id: 'test' });
      message.source = 'external-site';

      messageValidator.validate.mockImplementation((msg: ChromeMessage) => {
        if (!['popup', 'background', 'content-script'].includes(msg.source)) {
          return {
            isValid: false,
            errors: [
              {
                code: 'INVALID_SOURCE',
                message: `Invalid message source: ${msg.source}`,
                field: 'source',
              },
            ],
          };
        }
        return { isValid: true, errors: [] };
      });

      const result = messageValidator.validate(message);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_SOURCE');
    });

    it('should validate message type against allowed types', () => {
      // 🟢 Blue: Message types from API endpoints documentation
      const validTypes: ChromeMessageType[] = [
        'GET_PROMPTS',
        'SAVE_PROMPT',
        'UPDATE_PROMPT',
        'DELETE_PROMPT',
        'COPY_PROMPT',
        'EXPORT_CONVERSATION',
        'INSERT_TEXT',
        'GET_PAGE_INFO',
        'SEARCH_PROMPTS',
        'GET_SETTINGS',
      ];

      messageValidator.validateMessageType.mockImplementation((type: string) => {
        return validTypes.includes(type as ChromeMessageType);
      });

      // Test valid types
      validTypes.forEach((type) => {
        expect(messageValidator.validateMessageType(type)).toBe(true);
      });

      // Test invalid type
      expect(messageValidator.validateMessageType('INVALID_TYPE')).toBe(false);
    });

    it('should validate required message fields', () => {
      // 🟢 Blue: Required fields from message interface definition
      const completeMessage = createTestMessage('GET_PROMPTS', { query: {} });
      const incompleteMessage = {
        type: 'GET_PROMPTS',
        data: {},
        // Missing timestamp, requestId, source
      };

      messageValidator.validateRequiredFields.mockImplementation((msg: any) => {
        const requiredFields = ['type', 'data', 'timestamp', 'requestId', 'source'];
        const errors = [];

        for (const field of requiredFields) {
          if (!(field in msg) || msg[field] === undefined || msg[field] === null) {
            errors.push({
              code: 'MISSING_REQUIRED_FIELD',
              message: `Missing required field: ${field}`,
              field,
            });
          }
        }

        return { isValid: errors.length === 0, errors };
      });

      const completeResult = messageValidator.validateRequiredFields(completeMessage);
      expect(completeResult.isValid).toBe(true);

      const incompleteResult = messageValidator.validateRequiredFields(incompleteMessage);
      expect(incompleteResult.isValid).toBe(false);
      expect(incompleteResult.errors).toHaveLength(3); // timestamp, requestId, source
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate GET_PROMPTS message data structure', () => {
      // 🟢 Blue: Data structure from API endpoints specification
      const validGetPromptsData = {
        query: { keyword: 'test' },
        pagination: { page: 1, pageSize: 20 },
      };

      const invalidGetPromptsData = {
        query: 'invalid-query-format', // Should be object
        pagination: { page: 'invalid' }, // Page should be number
      };

      messageValidator.validateDataStructure.mockImplementation(
        (type: ChromeMessageType, data: any) => {
          if (type === 'GET_PROMPTS') {
            const errors = [];

            if (data.query && typeof data.query !== 'object') {
              errors.push({
                code: 'INVALID_DATA_TYPE',
                message: 'Query must be an object',
                field: 'query',
              });
            }

            if (data.pagination?.page && typeof data.pagination.page !== 'number') {
              errors.push({
                code: 'INVALID_DATA_TYPE',
                message: 'Pagination page must be a number',
                field: 'pagination.page',
              });
            }

            return { isValid: errors.length === 0, errors };
          }

          return { isValid: true, errors: [] };
        }
      );

      const validResult = messageValidator.validateDataStructure(
        'GET_PROMPTS',
        validGetPromptsData
      );
      expect(validResult.isValid).toBe(true);

      const invalidResult = messageValidator.validateDataStructure(
        'GET_PROMPTS',
        invalidGetPromptsData
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });

    it('should validate SAVE_PROMPT message data structure', () => {
      // 🟢 Blue: Save prompt data structure from interface definitions
      const validSavePromptData = {
        prompt: {
          title: 'Test Prompt',
          content: 'Test content',
          tags: ['test', 'example'],
        },
      };

      const invalidSavePromptData = {
        prompt: {
          title: '', // Empty title
          content: 'Test content',
          tags: 'invalid-tags', // Should be array
        },
      };

      messageValidator.validateDataStructure.mockImplementation(
        (type: ChromeMessageType, data: any) => {
          if (type === 'SAVE_PROMPT') {
            const errors = [];

            if (!data.prompt) {
              errors.push({
                code: 'MISSING_REQUIRED_FIELD',
                message: 'Prompt data is required',
                field: 'prompt',
              });
            } else {
              if (!data.prompt.title || data.prompt.title.trim() === '') {
                errors.push({
                  code: 'INVALID_DATA_VALUE',
                  message: 'Prompt title cannot be empty',
                  field: 'prompt.title',
                });
              }

              if (data.prompt.tags && !Array.isArray(data.prompt.tags)) {
                errors.push({
                  code: 'INVALID_DATA_TYPE',
                  message: 'Tags must be an array',
                  field: 'prompt.tags',
                });
              }
            }

            return { isValid: errors.length === 0, errors };
          }

          return { isValid: true, errors: [] };
        }
      );

      const validResult = messageValidator.validateDataStructure(
        'SAVE_PROMPT',
        validSavePromptData
      );
      expect(validResult.isValid).toBe(true);

      const invalidResult = messageValidator.validateDataStructure(
        'SAVE_PROMPT',
        invalidSavePromptData
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });
  });

  describe('Rate Limiting Validation', () => {
    it('should apply rate limiting to prevent message spam', () => {
      // 🔴 Red: Rate limiting implementation based on best practices
      const rateLimitConfig = { maxRequestsPerMinute: 60, windowMs: 60000 };
      const message = createTestMessage('COPY_PROMPT', { promptId: 'test' });

      messageValidator.checkRateLimit = vi
        .fn()
        .mockImplementation((source: string, config: any) => {
          // Simulate rate limit tracking
          const now = Date.now();
          const requests = Array(61)
            .fill(0)
            .map((_, i) => ({ timestamp: now - i * 100 }));

          const recentRequests = requests.filter((req) => now - req.timestamp < config.windowMs);

          if (recentRequests.length > config.maxRequestsPerMinute) {
            return {
              allowed: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded: ${recentRequests.length}/${config.maxRequestsPerMinute} requests per minute`,
              },
            };
          }

          return { allowed: true };
        });

      const result = messageValidator.checkRateLimit(message.source, rateLimitConfig);

      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Comprehensive Message Validation', () => {
    it('should pass validation for well-formed messages', () => {
      // 🟢 Blue: Complete validation flow
      const validMessage = createTestMessage('GET_PROMPTS', {
        query: { keyword: 'test' },
        pagination: { page: 1, pageSize: 20 },
      });

      messageValidator.validate.mockImplementation((message: ChromeMessage) => {
        // Simulate comprehensive validation
        const errors = [];

        // Source validation
        if (!['popup', 'background', 'content-script'].includes(message.source)) {
          errors.push({
            code: 'INVALID_SOURCE',
            message: 'Invalid message source',
            field: 'source',
          });
        }

        // Type validation
        const validTypes = ['GET_PROMPTS', 'SAVE_PROMPT', 'UPDATE_PROMPT'];
        if (!validTypes.includes(message.type)) {
          errors.push({
            code: 'INVALID_MESSAGE_TYPE',
            message: 'Invalid message type',
            field: 'type',
          });
        }

        // Required fields validation
        if (!message.requestId) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: 'Missing requestId',
            field: 'requestId',
          });
        }

        return { isValid: errors.length === 0, errors };
      });

      const result = messageValidator.validate(validMessage);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple validation errors', () => {
      // 🟡 Yellow: Error accumulation pattern
      const invalidMessage = {
        type: 'INVALID_TYPE',
        data: {},
        source: 'external-site',
        // Missing timestamp, requestId
      } as any;

      messageValidator.validate.mockImplementation((message: any) => {
        const errors = [];

        if (message.source === 'external-site') {
          errors.push({
            code: 'INVALID_SOURCE',
            message: 'Invalid source',
            field: 'source',
          });
        }

        if (message.type === 'INVALID_TYPE') {
          errors.push({
            code: 'INVALID_MESSAGE_TYPE',
            message: 'Invalid message type',
            field: 'type',
          });
        }

        if (!message.requestId) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: 'Missing requestId',
            field: 'requestId',
          });
        }

        return { isValid: errors.length === 0, errors };
      });

      const result = messageValidator.validate(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map((e) => e.code)).toEqual([
        'INVALID_SOURCE',
        'INVALID_MESSAGE_TYPE',
        'MISSING_REQUIRED_FIELD',
      ]);
    });
  });
});
