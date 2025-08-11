// TASK-0007: MessageValidator Test Cases
// TDD Test Implementation for Message Validation and Security

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * MessageValidator Test Suite
 * 
 * Tests the message validation functionality including:
 * - Message type validation and structure verification
 * - Security validation (XSS prevention, input sanitization)
 * - Data integrity and consistency checks
 * - Schema validation for different message types
 */

// Mock types for message validation
interface BaseMessage {
  id: string;
  type: string;
  timestamp: number;
  source: 'popup' | 'background' | 'content';
  target: 'popup' | 'background' | 'content';
}

interface PromptMessage extends BaseMessage {
  type: 'PROMPT_CREATE' | 'PROMPT_GET' | 'PROMPT_UPDATE' | 'PROMPT_DELETE';
  payload: {
    id?: string;
    title?: string;
    content?: string;
    tags?: string[];
    category?: string;
  };
}

interface ClipboardMessage extends BaseMessage {
  type: 'CLIPBOARD_COPY';
  payload: {
    text: string;
  };
}

interface ExportMessage extends BaseMessage {
  type: 'EXPORT_CONVERSATION';
  payload: {
    format: 'markdown' | 'json';
    data: any;
    metadata?: Record<string, any>;
  };
}

type Message = PromptMessage | ClipboardMessage | ExportMessage;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedMessage?: Message;
}

interface MessageValidator {
  validateMessage(message: any): ValidationResult;
  validateMessageStructure(message: any): boolean;
  validateMessageType(type: string): boolean;
  validatePayload(type: string, payload: any): boolean;
  sanitizeMessage(message: Message): Message;
  isValidSource(source: string): boolean;
  isValidTarget(target: string): boolean;
}

// Mock MessageValidator implementation for testing
class MockMessageValidator implements MessageValidator {
  private readonly VALID_MESSAGE_TYPES = [
    'PROMPT_CREATE', 'PROMPT_GET', 'PROMPT_UPDATE', 'PROMPT_DELETE',
    'CLIPBOARD_COPY', 'EXPORT_CONVERSATION'
  ];

  private readonly VALID_SOURCES = ['popup', 'background', 'content'];
  private readonly VALID_TARGETS = ['popup', 'background', 'content'];

  private readonly MAX_TITLE_LENGTH = 200;
  private readonly MAX_CONTENT_LENGTH = 10000;
  private readonly MAX_TEXT_LENGTH = 50000;

  validateMessage(message: any): ValidationResult {
    const errors: string[] = [];

    // Basic structure validation
    if (!this.validateMessageStructure(message)) {
      errors.push('Invalid message structure');
      return { isValid: false, errors };
    }

    // Type validation
    if (!this.validateMessageType(message.type)) {
      errors.push(`Invalid message type: ${message.type}`);
    }

    // Source validation
    if (!this.isValidSource(message.source)) {
      errors.push(`Invalid source: ${message.source}`);
    }

    // Target validation
    if (!this.isValidTarget(message.target)) {
      errors.push(`Invalid target: ${message.target}`);
    }

    // Payload validation
    if (!this.validatePayload(message.type, message.payload)) {
      errors.push('Invalid payload for message type');
    }

    // Sanitization
    let sanitizedMessage: Message | undefined;
    if (errors.length === 0) {
      try {
        sanitizedMessage = this.sanitizeMessage(message as Message);
      } catch (error) {
        errors.push(`Sanitization failed: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedMessage
    };
  }

  validateMessageStructure(message: any): boolean {
    return (
      typeof message === 'object' &&
      message !== null &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      typeof message.timestamp === 'number' &&
      typeof message.source === 'string' &&
      typeof message.target === 'string' &&
      typeof message.payload === 'object' &&
      message.payload !== null
    );
  }

  validateMessageType(type: string): boolean {
    return this.VALID_MESSAGE_TYPES.includes(type);
  }

  validatePayload(type: string, payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    switch (type) {
      case 'PROMPT_CREATE':
        return this.validatePromptCreatePayload(payload);
      case 'PROMPT_GET':
        return this.validatePromptGetPayload(payload);
      case 'PROMPT_UPDATE':
        return this.validatePromptUpdatePayload(payload);
      case 'PROMPT_DELETE':
        return this.validatePromptDeletePayload(payload);
      case 'CLIPBOARD_COPY':
        return this.validateClipboardPayload(payload);
      case 'EXPORT_CONVERSATION':
        return this.validateExportPayload(payload);
      default:
        return false;
    }
  }

  private validatePromptCreatePayload(payload: any): boolean {
    return (
      typeof payload.title === 'string' &&
      payload.title.length > 0 &&
      payload.title.length <= this.MAX_TITLE_LENGTH &&
      typeof payload.content === 'string' &&
      payload.content.length > 0 &&
      payload.content.length <= this.MAX_CONTENT_LENGTH &&
      (payload.tags === undefined || Array.isArray(payload.tags)) &&
      (payload.category === undefined || typeof payload.category === 'string')
    );
  }

  private validatePromptGetPayload(payload: any): boolean {
    return (
      (payload.id === undefined || typeof payload.id === 'string') &&
      (payload.category === undefined || typeof payload.category === 'string')
    );
  }

  private validatePromptUpdatePayload(payload: any): boolean {
    return (
      typeof payload.id === 'string' &&
      payload.id.length > 0 &&
      (payload.title === undefined || (typeof payload.title === 'string' && payload.title.length <= this.MAX_TITLE_LENGTH)) &&
      (payload.content === undefined || (typeof payload.content === 'string' && payload.content.length <= this.MAX_CONTENT_LENGTH))
    );
  }

  private validatePromptDeletePayload(payload: any): boolean {
    return (
      typeof payload.id === 'string' &&
      payload.id.length > 0
    );
  }

  private validateClipboardPayload(payload: any): boolean {
    return (
      typeof payload.text === 'string' &&
      payload.text.length > 0 &&
      payload.text.length <= this.MAX_TEXT_LENGTH
    );
  }

  private validateExportPayload(payload: any): boolean {
    return (
      (payload.format === 'markdown' || payload.format === 'json') &&
      payload.data !== undefined
    );
  }

  sanitizeMessage(message: Message): Message {
    const sanitized = { ...message };

    // Sanitize HTML and potential XSS in string fields
    if (sanitized.payload) {
      sanitized.payload = this.sanitizePayload(sanitized.payload);
    }

    return sanitized;
  }

  private sanitizePayload(payload: any): any {
    const sanitized = { ...payload };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      }
    }

    return sanitized;
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:(?!image)[^;]+;base64,/gi, '') // Remove non-image data URIs
      .trim();
  }

  isValidSource(source: string): boolean {
    return this.VALID_SOURCES.includes(source);
  }

  isValidTarget(target: string): boolean {
    return this.VALID_TARGETS.includes(target);
  }
}

describe('MessageValidator', () => {
  let messageValidator: MessageValidator;

  beforeEach(() => {
    messageValidator = new MockMessageValidator();
  });

  describe('Message Structure Validation', () => {
    it('should validate correct message structure', () => {
      // Arrange
      const validMessage = {
        id: 'msg-001',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { title: 'Test', content: 'Content' }
      };

      // Act
      const result = messageValidator.validateMessageStructure(validMessage);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject message with missing required fields', () => {
      // Arrange
      const invalidMessages = [
        { type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', target: 'background', payload: {} }, // missing id
        { id: 'msg-001', timestamp: Date.now(), source: 'popup', target: 'background', payload: {} }, // missing type
        { id: 'msg-001', type: 'PROMPT_CREATE', source: 'popup', target: 'background', payload: {} }, // missing timestamp
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), target: 'background', payload: {} }, // missing source
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', payload: {} }, // missing target
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', target: 'background' }, // missing payload
      ];

      // Act & Assert
      invalidMessages.forEach(message => {
        expect(messageValidator.validateMessageStructure(message)).toBe(false);
      });
    });

    it('should reject non-object messages', () => {
      // Arrange
      const invalidMessages = [
        null,
        undefined,
        'string',
        123,
        [],
        true
      ];

      // Act & Assert
      invalidMessages.forEach(message => {
        expect(messageValidator.validateMessageStructure(message)).toBe(false);
      });
    });

    it('should reject messages with incorrect field types', () => {
      // Arrange
      const invalidMessages = [
        { id: 123, type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', target: 'background', payload: {} },
        { id: 'msg-001', type: null, timestamp: Date.now(), source: 'popup', target: 'background', payload: {} },
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: 'invalid', source: 'popup', target: 'background', payload: {} },
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), source: null, target: 'background', payload: {} },
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', target: 123, payload: {} },
        { id: 'msg-001', type: 'PROMPT_CREATE', timestamp: Date.now(), source: 'popup', target: 'background', payload: null },
      ];

      // Act & Assert
      invalidMessages.forEach(message => {
        expect(messageValidator.validateMessageStructure(message)).toBe(false);
      });
    });
  });

  describe('Message Type Validation', () => {
    it('should validate supported message types', () => {
      // Arrange
      const validTypes = [
        'PROMPT_CREATE', 'PROMPT_GET', 'PROMPT_UPDATE', 'PROMPT_DELETE',
        'CLIPBOARD_COPY', 'EXPORT_CONVERSATION'
      ];

      // Act & Assert
      validTypes.forEach(type => {
        expect(messageValidator.validateMessageType(type)).toBe(true);
      });
    });

    it('should reject unsupported message types', () => {
      // Arrange
      const invalidTypes = [
        'INVALID_TYPE', 'prompt_create', 'PROMPT_INVALID',
        '', null, undefined, 123, {}
      ];

      // Act & Assert
      invalidTypes.forEach(type => {
        expect(messageValidator.validateMessageType(type)).toBe(false);
      });
    });
  });

  describe('Source and Target Validation', () => {
    it('should validate valid sources', () => {
      // Arrange
      const validSources = ['popup', 'background', 'content'];

      // Act & Assert
      validSources.forEach(source => {
        expect(messageValidator.isValidSource(source)).toBe(true);
      });
    });

    it('should reject invalid sources', () => {
      // Arrange
      const invalidSources = ['invalid', 'web', 'external', '', null, undefined];

      // Act & Assert
      invalidSources.forEach(source => {
        expect(messageValidator.isValidSource(source)).toBe(false);
      });
    });

    it('should validate valid targets', () => {
      // Arrange
      const validTargets = ['popup', 'background', 'content'];

      // Act & Assert
      validTargets.forEach(target => {
        expect(messageValidator.isValidTarget(target)).toBe(true);
      });
    });

    it('should reject invalid targets', () => {
      // Arrange
      const invalidTargets = ['invalid', 'web', 'external', '', null, undefined];

      // Act & Assert
      invalidTargets.forEach(target => {
        expect(messageValidator.isValidTarget(target)).toBe(false);
      });
    });
  });

  describe('Payload Validation - Prompt Messages', () => {
    it('should validate PROMPT_CREATE payload', () => {
      // Arrange
      const validPayloads = [
        { title: 'Test Title', content: 'Test content' },
        { title: 'Test', content: 'Content', tags: ['tag1', 'tag2'], category: 'work' },
      ];

      // Act & Assert
      validPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_CREATE', payload)).toBe(true);
      });
    });

    it('should reject invalid PROMPT_CREATE payloads', () => {
      // Arrange
      const invalidPayloads = [
        { content: 'Missing title' }, // missing title
        { title: 'Missing content' }, // missing content
        { title: '', content: 'Empty title' }, // empty title
        { title: 'Title', content: '' }, // empty content
        { title: 'x'.repeat(201), content: 'Too long title' }, // title too long
        { title: 'Title', content: 'x'.repeat(10001) }, // content too long
        { title: 123, content: 'Invalid title type' }, // invalid title type
        { title: 'Title', content: 123 }, // invalid content type
      ];

      // Act & Assert
      invalidPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_CREATE', payload)).toBe(false);
      });
    });

    it('should validate PROMPT_GET payload', () => {
      // Arrange
      const validPayloads = [
        {}, // empty is valid for get all
        { id: 'prompt-123' },
        { category: 'work' },
        { id: 'prompt-123', category: 'work' },
      ];

      // Act & Assert
      validPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_GET', payload)).toBe(true);
      });
    });

    it('should validate PROMPT_UPDATE payload', () => {
      // Arrange
      const validPayloads = [
        { id: 'prompt-123', title: 'Updated title' },
        { id: 'prompt-123', content: 'Updated content' },
        { id: 'prompt-123', title: 'Title', content: 'Content' },
      ];

      // Act & Assert
      validPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_UPDATE', payload)).toBe(true);
      });
    });

    it('should reject invalid PROMPT_UPDATE payloads', () => {
      // Arrange
      const invalidPayloads = [
        { title: 'Missing ID' }, // missing required id
        { id: '' }, // empty id
        { id: 'prompt-123', title: 'x'.repeat(201) }, // title too long
        { id: 'prompt-123', content: 'x'.repeat(10001) }, // content too long
      ];

      // Act & Assert
      invalidPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_UPDATE', payload)).toBe(false);
      });
    });

    it('should validate PROMPT_DELETE payload', () => {
      // Arrange
      const validPayload = { id: 'prompt-123' };

      // Act
      const result = messageValidator.validatePayload('PROMPT_DELETE', validPayload);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid PROMPT_DELETE payloads', () => {
      // Arrange
      const invalidPayloads = [
        {}, // missing id
        { id: '' }, // empty id
        { id: 123 }, // invalid id type
      ];

      // Act & Assert
      invalidPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('PROMPT_DELETE', payload)).toBe(false);
      });
    });
  });

  describe('Payload Validation - Other Message Types', () => {
    it('should validate CLIPBOARD_COPY payload', () => {
      // Arrange
      const validPayloads = [
        { text: 'Text to copy' },
        { text: 'Multi\nline\ntext' },
      ];

      // Act & Assert
      validPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('CLIPBOARD_COPY', payload)).toBe(true);
      });
    });

    it('should reject invalid CLIPBOARD_COPY payloads', () => {
      // Arrange
      const invalidPayloads = [
        {}, // missing text
        { text: '' }, // empty text
        { text: 'x'.repeat(50001) }, // text too long
        { text: 123 }, // invalid text type
      ];

      // Act & Assert
      invalidPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('CLIPBOARD_COPY', payload)).toBe(false);
      });
    });

    it('should validate EXPORT_CONVERSATION payload', () => {
      // Arrange
      const validPayloads = [
        { format: 'markdown', data: { conversation: 'test' } },
        { format: 'json', data: [] },
        { format: 'markdown', data: 'string data', metadata: { title: 'Test' } },
      ];

      // Act & Assert
      validPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('EXPORT_CONVERSATION', payload)).toBe(true);
      });
    });

    it('should reject invalid EXPORT_CONVERSATION payloads', () => {
      // Arrange
      const invalidPayloads = [
        { data: 'Missing format' }, // missing format
        { format: 'xml', data: 'Invalid format' }, // invalid format
        { format: 'markdown' }, // missing data
      ];

      // Act & Assert
      invalidPayloads.forEach(payload => {
        expect(messageValidator.validatePayload('EXPORT_CONVERSATION', payload)).toBe(false);
      });
    });
  });

  describe('Full Message Validation', () => {
    it('should validate complete valid messages', () => {
      // Arrange
      const validMessages = [
        {
          id: 'msg-001',
          type: 'PROMPT_CREATE',
          timestamp: Date.now(),
          source: 'popup',
          target: 'background',
          payload: { title: 'Test', content: 'Content' }
        },
        {
          id: 'msg-002',
          type: 'CLIPBOARD_COPY',
          timestamp: Date.now(),
          source: 'popup',
          target: 'background',
          payload: { text: 'Copy this' }
        }
      ];

      // Act & Assert
      validMessages.forEach(message => {
        const result = messageValidator.validateMessage(message);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedMessage).toBeDefined();
      });
    });

    it('should return validation errors for invalid messages', () => {
      // Arrange
      const invalidMessage = {
        id: 'msg-003',
        type: 'INVALID_TYPE',
        timestamp: Date.now(),
        source: 'invalid_source',
        target: 'background',
        payload: { invalid: 'payload' }
      };

      // Act
      const result = messageValidator.validateMessage(invalidMessage);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.sanitizedMessage).toBeUndefined();
    });
  });

  describe('Message Sanitization', () => {
    it('should sanitize potentially dangerous content', () => {
      // Arrange
      const dangerousMessage = {
        id: 'msg-004',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {
          title: 'Safe Title<script>alert("xss")</script>',
          content: 'Content with javascript:alert("xss") link',
          tags: ['tag<script>alert("xss")</script>', 'safe-tag']
        }
      } as Message;

      // Act
      const sanitized = messageValidator.sanitizeMessage(dangerousMessage);

      // Assert
      expect(sanitized.payload.title).not.toContain('<script>');
      expect(sanitized.payload.content).not.toContain('javascript:');
      expect(sanitized.payload.tags[0]).not.toContain('<script>');
      expect(sanitized.payload.tags[1]).toBe('safe-tag'); // Should remain unchanged
    });

    it('should remove event handlers from strings', () => {
      // Arrange
      const message = {
        id: 'msg-005',
        type: 'CLIPBOARD_COPY',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {
          text: 'Click here: <div onclick="malicious()">content</div>'
        }
      } as Message;

      // Act
      const sanitized = messageValidator.sanitizeMessage(message);

      // Assert
      expect(sanitized.payload.text).not.toContain('onclick=');
    });

    it('should preserve safe content during sanitization', () => {
      // Arrange
      const safeMessage = {
        id: 'msg-006',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {
          title: 'Safe Title',
          content: 'Safe content with normal text',
          tags: ['work', 'important']
        }
      } as Message;

      // Act
      const sanitized = messageValidator.sanitizeMessage(safeMessage);

      // Assert
      expect(sanitized.payload.title).toBe('Safe Title');
      expect(sanitized.payload.content).toBe('Safe content with normal text');
      expect(sanitized.payload.tags).toEqual(['work', 'important']);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle extremely long inputs gracefully', () => {
      // Arrange
      const longMessage = {
        id: 'msg-007',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {
          title: 'x'.repeat(500),
          content: 'x'.repeat(20000)
        }
      };

      // Act
      const result = messageValidator.validateMessage(longMessage);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid payload for message type');
    });

    it('should handle null and undefined values in payload', () => {
      // Arrange
      const messageWithNulls = {
        id: 'msg-008',
        type: 'PROMPT_UPDATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {
          id: 'prompt-123',
          title: null,
          content: undefined
        }
      };

      // Act
      const result = messageValidator.validateMessage(messageWithNulls);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should handle circular references in payload', () => {
      // Arrange
      const circularObj: any = { id: 'prompt-123' };
      circularObj.self = circularObj;
      
      const messageWithCircular = {
        id: 'msg-009',
        type: 'PROMPT_UPDATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: circularObj
      };

      // Act & Assert
      // This should not crash the validator
      expect(() => messageValidator.validateMessage(messageWithCircular))
        .not
        .toThrow();
    });
  });
});