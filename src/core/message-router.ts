import type { ChromeMessage, ChromeResponse, ChromeMessageType } from '@/types';

export interface MessageHandler {
  handle(message: ChromeMessage): Promise<ChromeResponse>;
}

// Constants for message validation
const VALID_MESSAGE_TYPES: ChromeMessageType[] = [
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

export class MessageRouter {
  private handlers = new Map<ChromeMessageType, MessageHandler>();

  addHandler(type: ChromeMessageType, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  removeHandler(type: ChromeMessageType): boolean {
    return this.handlers.delete(type);
  }

  hasHandler(type: ChromeMessageType): boolean {
    return this.handlers.has(type);
  }

  async process(message: ChromeMessage): Promise<ChromeResponse> {
    try {
      // Validate required fields
      const validationError = this.validateMessage(message);
      if (validationError) {
        return validationError;
      }

      // Find and execute handler
      const handler = this.handlers.get(message.type);
      if (!handler) {
        return this.createErrorResponse(
          'NO_HANDLER_FOUND',
          `No handler registered for message type: ${message.type}`,
          message.requestId,
          message.type
        );
      }

      // Process message
      return await handler.handle(message);
    } catch (error) {
      return this.createErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        message.requestId || 'unknown',
        message.type || 'UNKNOWN'
      );
    }
  }

  private validateMessage(message: ChromeMessage): ChromeResponse | null {
    // Check required fields
    if (!message.type || !message.requestId) {
      const missingField = !message.type ? 'type' : 'requestId';
      return this.createErrorResponse(
        'INVALID_REQUEST_DATA',
        `Missing required field: ${missingField}`,
        message.requestId || 'unknown',
        message.type || 'UNKNOWN'
      );
    }

    // Check if message type is valid
    if (!VALID_MESSAGE_TYPES.includes(message.type)) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Unknown message type: ${message.type}`,
        message.requestId,
        message.type
      );
    }

    return null;
  }

  private createErrorResponse(
    code: string,
    message: string,
    requestId: string,
    messageType: string
  ): ChromeResponse {
    return {
      success: false,
      error: { code, message },
      requestId,
      messageType: messageType as ChromeMessageType,
    };
  }
}
