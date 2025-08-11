import type { CreatePromptRequest, UpdatePromptRequest, PromptMetadata } from '@/types';
import {
  validatePromptTitle,
  validatePromptContent,
  validateTags,
  POCKET_PROMPT_CONSTANTS,
} from '@/types';

export class PromptValidator {
  static validateCreateRequest(request: CreatePromptRequest): string[] {
    const errors: string[] = [];

    // Validate required fields for creation
    this.validateRequiredField('title', request.title, errors);
    this.validateRequiredField('content', request.content, errors);

    // Validate optional fields
    if (request.tags) {
      this.validateFieldContent('tags', request.tags, errors);
    }

    return errors;
  }

  static validateUpdateRequest(request: UpdatePromptRequest): string[] {
    const errors: string[] = [];

    // Validate optional fields if provided
    if (request.title !== undefined) {
      this.validateRequiredField('title', request.title, errors);
    }

    if (request.content !== undefined) {
      this.validateRequiredField('content', request.content, errors);
    }

    if (request.tags) {
      this.validateFieldContent('tags', request.tags, errors);
    }

    return errors;
  }

  private static validateRequiredField(
    fieldName: 'title' | 'content',
    value: string,
    errors: string[]
  ): void {
    if (!value || value.trim() === '') {
      errors.push(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
      return;
    }

    this.validateFieldContent(fieldName, value, errors);
  }

  private static validateFieldContent(
    fieldName: 'title' | 'content' | 'tags',
    value: string | string[],
    errors: string[]
  ): void {
    let fieldErrors: string[] = [];

    switch (fieldName) {
      case 'title':
        fieldErrors = validatePromptTitle(value as string);
        break;
      case 'content':
        fieldErrors = validatePromptContent(value as string);
        break;
      case 'tags':
        fieldErrors = validateTags(value as string[]);
        break;
    }

    errors.push(...fieldErrors);
  }

  static validatePromptId(id: any): string[] {
    const errors: string[] = [];

    if (!id || (typeof id === 'string' && id.trim() === '')) {
      errors.push('Prompt ID is required');
      return errors;
    }

    if (typeof id !== 'string') {
      errors.push('Prompt ID must be a string');
      return errors;
    }

    // Basic format validation - should be reasonably formatted
    // Require minimum length and proper UUID-like format with digits
    const hasMinLength = id.length >= 20;
    const hasSeparator = id.includes('-') || id.includes('_');
    const hasValidChars = /^[a-zA-Z0-9\-_]+$/.test(id);
    const hasDigits = /\d/.test(id);

    if (!hasMinLength || !hasSeparator || !hasValidChars || !hasDigits) {
      errors.push('Invalid prompt ID format');
    }

    return errors;
  }

  static validateMetadata(metadata: any): string[] {
    const errors: string[] = [];

    if (!metadata || typeof metadata !== 'object') {
      return errors; // Metadata is optional, so empty object is valid
    }

    // Validate usageCount
    if (metadata.usageCount !== undefined) {
      if (typeof metadata.usageCount !== 'number' || metadata.usageCount < 0) {
        errors.push('Usage count cannot be negative');
      }
    }

    // Validate sourceUrl
    if (metadata.sourceUrl !== undefined && metadata.sourceUrl !== null) {
      if (typeof metadata.sourceUrl === 'string' && metadata.sourceUrl.trim() !== '') {
        try {
          new URL(metadata.sourceUrl);
        } catch {
          errors.push('Source URL must be a valid URL');
        }
      }
    }

    // Validate lastUsedAt
    if (metadata.lastUsedAt !== undefined && metadata.lastUsedAt !== null) {
      if (typeof metadata.lastUsedAt === 'string') {
        const date = new Date(metadata.lastUsedAt);
        if (isNaN(date.getTime())) {
          errors.push('Last used date must be a valid ISO date string');
        }
      }
    }

    return errors;
  }
}
