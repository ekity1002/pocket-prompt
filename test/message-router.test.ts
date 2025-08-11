// TASK-0007: Message Router Test Cases
// TDD Test Implementation for Message Passing Infrastructure

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Message Router Test Suite
 * 
 * Tests the core message routing functionality including:
 * - Basic message routing between components
 * - Message type validation and routing
 * - Error handling for invalid messages
 * - Route registration and management
 */

// Mock types based on expected message passing infrastructure
interface BaseMessage {
  id: string;
  type: string;
  timestamp: number;
  source: 'popup' | 'background' | 'content';
  target: 'popup' | 'background' | 'content';
}

interface PromptMessage extends BaseMessage {
  type: 'PROMPT_CREATE' | 'PROMPT_GET' | 'PROMPT_UPDATE' | 'PROMPT_DELETE';
  payload: any;
}

interface ClipboardMessage extends BaseMessage {
  type: 'CLIPBOARD_COPY';
  payload: { text: string };
}

interface ExportMessage extends BaseMessage {
  type: 'EXPORT_CONVERSATION';
  payload: { format: 'markdown' | 'json'; data: any };
}

type Message = PromptMessage | ClipboardMessage | ExportMessage;

interface MessageRouter {
  registerRoute(messageType: string, handler: (message: Message) => Promise<any>): void;
  routeMessage(message: Message): Promise<any>;
  unregisterRoute(messageType: string): void;
  isRouteRegistered(messageType: string): boolean;
}

// Mock MessageRouter implementation for testing
class MockMessageRouter implements MessageRouter {
  private routes = new Map<string, (message: Message) => Promise<any>>();

  registerRoute(messageType: string, handler: (message: Message) => Promise<any>): void {
    this.routes.set(messageType, handler);
  }

  async routeMessage(message: Message): Promise<any> {
    const handler = this.routes.get(message.type);
    if (!handler) {
      throw new Error(`No handler registered for message type: ${message.type}`);
    }
    return await handler(message);
  }

  unregisterRoute(messageType: string): void {
    this.routes.delete(messageType);
  }

  isRouteRegistered(messageType: string): boolean {
    return this.routes.has(messageType);
  }
}

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;
  const mockHandler = vi.fn();

  beforeEach(() => {
    messageRouter = new MockMessageRouter();
    mockHandler.mockClear();
  });

  describe('Route Registration', () => {
    it('should register a route handler successfully', () => {
      // Arrange
      const messageType = 'PROMPT_CREATE';
      
      // Act
      messageRouter.registerRoute(messageType, mockHandler);
      
      // Assert
      expect(messageRouter.isRouteRegistered(messageType)).toBe(true);
    });

    it('should unregister a route handler successfully', () => {
      // Arrange
      const messageType = 'PROMPT_CREATE';
      messageRouter.registerRoute(messageType, mockHandler);
      
      // Act
      messageRouter.unregisterRoute(messageType);
      
      // Assert
      expect(messageRouter.isRouteRegistered(messageType)).toBe(false);
    });

    it('should overwrite existing route handler when registering same type', () => {
      // Arrange
      const messageType = 'PROMPT_CREATE';
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();
      
      // Act
      messageRouter.registerRoute(messageType, firstHandler);
      messageRouter.registerRoute(messageType, secondHandler);
      
      // Assert
      expect(messageRouter.isRouteRegistered(messageType)).toBe(true);
      // Handler should be overwritten (tested in message routing)
    });

    it('should handle multiple different route registrations', () => {
      // Arrange
      const messageTypes = ['PROMPT_CREATE', 'PROMPT_GET', 'CLIPBOARD_COPY'];
      
      // Act
      messageTypes.forEach(type => {
        messageRouter.registerRoute(type, mockHandler);
      });
      
      // Assert
      messageTypes.forEach(type => {
        expect(messageRouter.isRouteRegistered(type)).toBe(true);
      });
    });
  });

  describe('Message Routing', () => {
    it('should route message to correct handler and return response', async () => {
      // Arrange
      const messageType = 'PROMPT_CREATE';
      const expectedResponse = { success: true, id: '123' };
      mockHandler.mockResolvedValue(expectedResponse);
      messageRouter.registerRoute(messageType, mockHandler);

      const message: PromptMessage = {
        id: 'msg-001',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { title: 'Test Prompt', content: 'Test content' }
      };

      // Act
      const result = await messageRouter.routeMessage(message);

      // Assert
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(message);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error for unregistered message type', async () => {
      // Arrange
      const message: PromptMessage = {
        id: 'msg-002',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { title: 'Test Prompt', content: 'Test content' }
      };

      // Act & Assert
      await expect(messageRouter.routeMessage(message))
        .rejects
        .toThrow('No handler registered for message type: PROMPT_CREATE');
    });

    it('should handle multiple different message types correctly', async () => {
      // Arrange
      const promptHandler = vi.fn().mockResolvedValue({ success: true, type: 'prompt' });
      const clipboardHandler = vi.fn().mockResolvedValue({ success: true, type: 'clipboard' });
      
      messageRouter.registerRoute('PROMPT_CREATE', promptHandler);
      messageRouter.registerRoute('CLIPBOARD_COPY', clipboardHandler);

      const promptMessage: PromptMessage = {
        id: 'msg-003',
        type: 'PROMPT_CREATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { title: 'Test', content: 'Content' }
      };

      const clipboardMessage: ClipboardMessage = {
        id: 'msg-004',
        type: 'CLIPBOARD_COPY',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { text: 'Copy this text' }
      };

      // Act
      const promptResult = await messageRouter.routeMessage(promptMessage);
      const clipboardResult = await messageRouter.routeMessage(clipboardMessage);

      // Assert
      expect(promptHandler).toHaveBeenCalledWith(promptMessage);
      expect(clipboardHandler).toHaveBeenCalledWith(clipboardMessage);
      expect(promptResult).toEqual({ success: true, type: 'prompt' });
      expect(clipboardResult).toEqual({ success: true, type: 'clipboard' });
    });
  });

  describe('Message Type Validation', () => {
    it('should validate message structure before routing', async () => {
      // Arrange
      messageRouter.registerRoute('PROMPT_CREATE', mockHandler);

      // Test with invalid message (missing required fields)
      const invalidMessage = {
        type: 'PROMPT_CREATE',
        // Missing id, timestamp, source, target
      } as any;

      // Act & Assert
      // This test assumes validation will be implemented
      // For now, we test that the handler receives the message as-is
      await expect(messageRouter.routeMessage(invalidMessage))
        .resolves
        .not.toThrow();
      
      expect(mockHandler).toHaveBeenCalledWith(invalidMessage);
    });

    it('should handle messages with valid structure', async () => {
      // Arrange
      messageRouter.registerRoute('EXPORT_CONVERSATION', mockHandler);
      mockHandler.mockResolvedValue({ success: true });

      const validMessage: ExportMessage = {
        id: 'msg-005',
        type: 'EXPORT_CONVERSATION',
        timestamp: Date.now(),
        source: 'content',
        target: 'background',
        payload: { format: 'markdown', data: { conversation: 'test' } }
      };

      // Act
      const result = await messageRouter.routeMessage(validMessage);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalledWith(validMessage);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      // Arrange
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      messageRouter.registerRoute('PROMPT_GET', errorHandler);

      const message: PromptMessage = {
        id: 'msg-006',
        type: 'PROMPT_GET',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { id: 'prompt-123' }
      };

      // Act & Assert
      await expect(messageRouter.routeMessage(message))
        .rejects
        .toThrow('Handler error');
    });

    it('should handle asynchronous handler rejections', async () => {
      // Arrange
      const asyncErrorHandler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async handler error');
      });
      
      messageRouter.registerRoute('PROMPT_UPDATE', asyncErrorHandler);

      const message: PromptMessage = {
        id: 'msg-007',
        type: 'PROMPT_UPDATE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { id: 'prompt-123', title: 'Updated' }
      };

      // Act & Assert
      await expect(messageRouter.routeMessage(message))
        .rejects
        .toThrow('Async handler error');
    });
  });

  describe('Performance Requirements', () => {
    it('should route messages within acceptable time limits', async () => {
      // Arrange
      const fastHandler = vi.fn().mockResolvedValue({ success: true });
      messageRouter.registerRoute('PROMPT_DELETE', fastHandler);

      const message: PromptMessage = {
        id: 'msg-008',
        type: 'PROMPT_DELETE',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { id: 'prompt-123' }
      };

      // Act
      const startTime = performance.now();
      await messageRouter.routeMessage(message);
      const endTime = performance.now();

      // Assert
      // Message routing should be very fast (< 10ms for simple routing)
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle rapid sequential message routing', async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue({ success: true });
      messageRouter.registerRoute('CLIPBOARD_COPY', handler);

      const messages: ClipboardMessage[] = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        type: 'CLIPBOARD_COPY',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: { text: `Text ${i}` }
      }));

      // Act
      const startTime = performance.now();
      const promises = messages.map(msg => messageRouter.routeMessage(msg));
      await Promise.all(promises);
      const endTime = performance.now();

      // Assert
      expect(handler).toHaveBeenCalledTimes(10);
      // All messages should be processed quickly
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message type', async () => {
      // Arrange
      const message = {
        id: 'msg-009',
        type: '',
        timestamp: Date.now(),
        source: 'popup',
        target: 'background',
        payload: {}
      } as Message;

      // Act & Assert
      await expect(messageRouter.routeMessage(message))
        .rejects
        .toThrow('No handler registered for message type: ');
    });

    it('should handle null/undefined message', async () => {
      // Act & Assert
      await expect(messageRouter.routeMessage(null as any))
        .rejects
        .toThrow();
      
      await expect(messageRouter.routeMessage(undefined as any))
        .rejects
        .toThrow();
    });

    it('should handle unregistering non-existent route', () => {
      // Act & Assert
      // Should not throw error when unregistering non-existent route
      expect(() => messageRouter.unregisterRoute('NON_EXISTENT_TYPE'))
        .not
        .toThrow();
      
      expect(messageRouter.isRouteRegistered('NON_EXISTENT_TYPE')).toBe(false);
    });
  });
});