import type { ChromeMessage, ChromeMessageType } from '@/types';

export interface ValidationError {
  code: string;
  message: string;
  field: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Constants moved outside class for better maintainability
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

const VALID_SOURCES = ['popup', 'background', 'content-script'];

const REQUIRED_MESSAGE_FIELDS = ['type', 'data', 'timestamp', 'requestId', 'source'];

// Rate limiting defaults
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 60;
const DEFAULT_WINDOW_MS = 60000;

export class MessageValidator {
  private rateLimitTracking = new Map<string, number[]>();
  private readonly maxRequestsPerMinute: number;
  private readonly windowMs: number;

  constructor(
    maxRequestsPerMinute = DEFAULT_MAX_REQUESTS_PER_MINUTE,
    windowMs = DEFAULT_WINDOW_MS
  ) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.windowMs = windowMs;
  }

  validate(message: ChromeMessage): ValidationResult {
    const errors: ValidationError[] = [];

    // Source validation
    if (!this.validateSource(message, 'chrome-extension://')) {
      errors.push({
        code: 'INVALID_SOURCE',
        message: `Invalid message source: ${message.source}`,
        field: 'source',
      });
    }

    // Message type validation
    if (!this.validateMessageType(message.type)) {
      errors.push({
        code: 'INVALID_MESSAGE_TYPE',
        message: `Invalid message type: ${message.type}`,
        field: 'type',
      });
    }

    // Required fields validation
    const requiredFieldsResult = this.validateRequiredFields(message);
    errors.push(...requiredFieldsResult.errors);

    // Data structure validation
    const dataStructureResult = this.validateDataStructure(message.type, message.data);
    errors.push(...dataStructureResult.errors);

    return { isValid: errors.length === 0, errors };
  }

  validateSource(message: ChromeMessage, origin: string): boolean {
    return VALID_SOURCES.includes(message.source);
  }

  validateMessageType(type: string): boolean {
    return VALID_MESSAGE_TYPES.includes(type as ChromeMessageType);
  }

  validateRequiredFields(message: any): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of REQUIRED_MESSAGE_FIELDS) {
      if (!(field in message) || message[field] === undefined || message[field] === null) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          field,
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateDataStructure(type: ChromeMessageType, data: any): ValidationResult {
    const errors: ValidationError[] = [];

    switch (type) {
      case 'GET_PROMPTS':
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
        break;

      case 'SAVE_PROMPT':
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
        break;

      case 'DELETE_PROMPT':
        if (!data.id || typeof data.id !== 'string') {
          errors.push({
            code: 'INVALID_DATA_TYPE',
            message: 'Prompt ID must be a non-empty string',
            field: 'id',
          });
        }
        break;

      case 'INSERT_TEXT':
        if (!data.text || typeof data.text !== 'string') {
          errors.push({
            code: 'INVALID_DATA_TYPE',
            message: 'Text must be a non-empty string',
            field: 'text',
          });
        }
        break;

      // Add more validation rules as needed
      default:
        // Basic data validation for unknown types
        if (typeof data !== 'object') {
          errors.push({
            code: 'INVALID_DATA_TYPE',
            message: 'Data must be an object',
            field: 'data',
          });
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  checkRateLimit(
    source: string,
    config?: { maxRequestsPerMinute?: number; windowMs?: number }
  ): { allowed: boolean; error?: { code: string; message: string } } {
    const maxRequests = config?.maxRequestsPerMinute || this.maxRequestsPerMinute;
    const window = config?.windowMs || this.windowMs;
    const now = Date.now();

    // Get or create request history for this source
    if (!this.rateLimitTracking.has(source)) {
      this.rateLimitTracking.set(source, []);
    }

    const requestHistory = this.rateLimitTracking.get(source)!;

    // Remove requests outside the current window
    const recentRequests = requestHistory.filter((timestamp) => now - timestamp < window);
    this.rateLimitTracking.set(source, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return {
        allowed: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${recentRequests.length}/${maxRequests} requests per minute`,
        },
      };
    }

    // Add current request to history
    recentRequests.push(now);
    this.rateLimitTracking.set(source, recentRequests);

    return { allowed: true };
  }
}
