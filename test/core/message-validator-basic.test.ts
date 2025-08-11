import { describe, it, expect, beforeEach } from 'vitest';
import type { ChromeMessage } from '../../src/types';
import { MessageValidator } from '../../src/core/message-validator';

// Test utilities
const generateRequestId = () => `req-${Date.now()}-${Math.random()}`;

const createTestMessage = (
  type: any,
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

describe('MessageValidator - Basic Tests', () => {
  let messageValidator: MessageValidator;

  beforeEach(() => {
    messageValidator = new MessageValidator();
  });

  describe('Message Validation', () => {
    it('should validate well-formed GET_PROMPTS message', () => {
      const validMessage = createTestMessage('GET_PROMPTS', {
        query: { keyword: 'test' },
        pagination: { page: 1, pageSize: 20 },
      });

      const result = messageValidator.validate(validMessage);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid message source', () => {
      const invalidMessage = createTestMessage('GET_PROMPTS', {}, undefined, 'external-site');

      const result = messageValidator.validate(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_SOURCE')).toBe(true);
    });

    it('should reject invalid message type', () => {
      const invalidMessage = createTestMessage('INVALID_TYPE', {});

      const result = messageValidator.validate(invalidMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_MESSAGE_TYPE')).toBe(true);
    });

    it('should reject message with missing required fields', () => {
      const incompleteMessage = {
        type: 'GET_PROMPTS',
        data: {},
        // Missing timestamp, requestId, source
      };

      const result = messageValidator.validateRequiredFields(incompleteMessage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3); // timestamp, requestId, source
    });
  });

  describe('Source Validation', () => {
    it('should accept valid sources', () => {
      const validSources = ['popup', 'background', 'content-script'];

      validSources.forEach((source) => {
        const message = createTestMessage('GET_PROMPTS', {}, undefined, source);
        expect(messageValidator.validateSource(message, 'chrome-extension://')).toBe(true);
      });
    });

    it('should reject invalid sources', () => {
      const message = createTestMessage('GET_PROMPTS', {}, undefined, 'external-site');
      expect(messageValidator.validateSource(message, 'chrome-extension://')).toBe(false);
    });
  });

  describe('Message Type Validation', () => {
    it('should accept valid message types', () => {
      const validTypes = [
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

      validTypes.forEach((type) => {
        expect(messageValidator.validateMessageType(type)).toBe(true);
      });
    });

    it('should reject invalid message types', () => {
      expect(messageValidator.validateMessageType('INVALID_TYPE')).toBe(false);
    });
  });
});
