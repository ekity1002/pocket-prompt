import { describe, it, expect } from 'vitest';
import type { CreatePromptRequest, UpdatePromptRequest } from '@/types';
import { PromptValidator } from '../prompt-validator';

describe('PromptValidator', () => {
  describe('validateCreateRequest', () => {
    it('should pass validation for valid create request', () => {
      // 🟢 Blue: Basic validation requirements
      const validRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: 'Valid content with sufficient length',
        tags: ['valid', 'tags'],
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should reject empty title', () => {
      // 🟢 Blue: REQ-001 validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: '',
        content: 'Valid content',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Title is required');
    });

    it('should reject whitespace-only title', () => {
      // 🟢 Blue: Enhanced validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: '   ',
        content: 'Valid content',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Title is required');
    });

    it('should reject empty content', () => {
      // 🟢 Blue: REQ-001 validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: '',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Content is required');
    });

    it('should reject whitespace-only content', () => {
      // 🟢 Blue: Enhanced validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: '   \n  \t  ',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Content is required');
    });

    it('should reject title exceeding 200 characters', () => {
      // 🟢 Blue: Type definition constraint
      const longTitle = 'a'.repeat(201);
      const invalidRequest: CreatePromptRequest = {
        title: longTitle,
        content: 'Valid content',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Prompt title cannot exceed 200 characters');
    });

    it('should accept title with exactly 200 characters', () => {
      // 🟢 Blue: Boundary value testing
      const maxTitle = 'a'.repeat(200);
      const validRequest: CreatePromptRequest = {
        title: maxTitle,
        content: 'Valid content',
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).not.toContain('Prompt title cannot exceed 200 characters');
    });

    it('should reject content exceeding 10,000 characters', () => {
      // 🟢 Blue: EDGE-101 requirement
      const longContent = 'a'.repeat(10001);
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: longContent,
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Prompt content cannot exceed 10000 characters');
    });

    it('should accept content with exactly 10,000 characters', () => {
      // 🟢 Blue: EDGE-101 boundary testing
      const maxContent = 'a'.repeat(10000);
      const validRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: maxContent,
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).not.toContain('Prompt content cannot exceed 10000 characters');
    });

    it('should handle multiline content correctly', () => {
      // 🟢 Blue: Multi-line support requirement
      const multilineContent = `Line 1
Line 2
Line 3 with special characters: !@#$%^&*()
Line 4 with unicode: 日本語 🚀`;

      const validRequest: CreatePromptRequest = {
        title: 'Multiline Test',
        content: multilineContent,
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should validate tags array when provided', () => {
      // 🟢 Blue: Optional tags validation
      const validRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: 'Valid content',
        tags: ['valid-tag', 'another-tag'],
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should reject invalid tags', () => {
      // 🟡 Yellow: Enhanced tag validation inference
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: 'Valid content',
        tags: ['valid-tag', '', 'another-valid-tag'], // Empty tag
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Tags cannot be empty');
    });

    it('should accumulate multiple validation errors', () => {
      // 🟡 Yellow: Comprehensive validation behavior
      const invalidRequest: CreatePromptRequest = {
        title: '', // Empty title
        content: '', // Empty content
        tags: [''], // Invalid tag
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Title is required');
      expect(errors).toContain('Content is required');
      expect(errors).toContain('Tags cannot be empty');
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateRequest', () => {
    it('should pass validation for valid update request', () => {
      // 🟢 Blue: Update validation consistency
      const validRequest: UpdatePromptRequest = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const errors = PromptValidator.validateUpdateRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should pass validation for partial update', () => {
      // 🟢 Blue: Partial update support
      const partialRequest: UpdatePromptRequest = {
        title: 'Only title updated',
      };

      const errors = PromptValidator.validateUpdateRequest(partialRequest);

      expect(errors).toEqual([]);
    });

    it('should validate title length when provided', () => {
      // 🟢 Blue: Consistent validation rules
      const invalidRequest: UpdatePromptRequest = {
        title: 'a'.repeat(201),
      };

      const errors = PromptValidator.validateUpdateRequest(invalidRequest);

      expect(errors).toContain('Prompt title cannot exceed 200 characters');
    });

    it('should validate content length when provided', () => {
      // 🟢 Blue: EDGE-101 consistency
      const invalidRequest: UpdatePromptRequest = {
        content: 'a'.repeat(10001),
      };

      const errors = PromptValidator.validateUpdateRequest(invalidRequest);

      expect(errors).toContain('Prompt content cannot exceed 10000 characters');
    });

    it('should reject empty title when provided', () => {
      // 🟢 Blue: Validation consistency
      const invalidRequest: UpdatePromptRequest = {
        title: '',
      };

      const errors = PromptValidator.validateUpdateRequest(invalidRequest);

      expect(errors).toContain('Title is required');
    });

    it('should reject empty content when provided', () => {
      // 🟢 Blue: Validation consistency
      const invalidRequest: UpdatePromptRequest = {
        content: '',
      };

      const errors = PromptValidator.validateUpdateRequest(invalidRequest);

      expect(errors).toContain('Content is required');
    });

    it('should validate tags when provided', () => {
      // 🟢 Blue: Tags validation consistency
      const invalidRequest: UpdatePromptRequest = {
        tags: ['valid-tag', '', 'another-tag'],
      };

      const errors = PromptValidator.validateUpdateRequest(invalidRequest);

      expect(errors).toContain('Tags cannot be empty');
    });

    it('should pass validation for empty update request', () => {
      // 🟡 Yellow: Edge case handling
      const emptyRequest: UpdatePromptRequest = {};

      const errors = PromptValidator.validateUpdateRequest(emptyRequest);

      expect(errors).toEqual([]);
    });
  });

  describe('validatePromptId', () => {
    it('should accept valid UUID format', () => {
      // 🟢 Blue: UUID validation requirement
      const validIds = [
        'prompt-123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'prompt-abcd1234-5678-90ef-ghij-klmnopqrstuv',
      ];

      validIds.forEach(id => {
        const errors = PromptValidator.validatePromptId(id);
        expect(errors).toEqual([]);
      });
    });

    it('should reject empty ID', () => {
      // 🟢 Blue: Required field validation
      const errors = PromptValidator.validatePromptId('');

      expect(errors).toContain('Prompt ID is required');
    });

    it('should reject null or undefined ID', () => {
      // 🟢 Blue: Defensive programming
      const nullErrors = PromptValidator.validatePromptId(null as any);
      const undefinedErrors = PromptValidator.validatePromptId(undefined as any);

      expect(nullErrors).toContain('Prompt ID is required');
      expect(undefinedErrors).toContain('Prompt ID is required');
    });

    it('should reject invalid ID formats', () => {
      // 🟢 Blue: Format validation requirement
      const invalidIds = [
        'not-a-uuid',
        '123',
        'prompt',
        'invalid-format-too-short',
      ];

      invalidIds.forEach(id => {
        const errors = PromptValidator.validatePromptId(id);
        expect(errors).toContain('Invalid prompt ID format');
      });
    });
  });

  describe('validateMetadata', () => {
    it('should accept valid metadata', () => {
      // 🟢 Blue: Metadata type validation
      const validMetadata = {
        usageCount: 5,
        lastUsedAt: '2024-01-01T00:00:00.000Z',
        isFavorite: true,
        sourceUrl: 'https://example.com',
        aiModel: 'gpt-4',
        description: 'A helpful prompt',
        author: 'Test Author',
        version: '1.0.0',
        isPrivate: false,
      };

      const errors = PromptValidator.validateMetadata(validMetadata);

      expect(errors).toEqual([]);
    });

    it('should reject negative usage count', () => {
      // 🟡 Yellow: Business rule inference
      const invalidMetadata = {
        usageCount: -1,
        isFavorite: false,
      };

      const errors = PromptValidator.validateMetadata(invalidMetadata);

      expect(errors).toContain('Usage count cannot be negative');
    });

    it('should validate URL format for sourceUrl', () => {
      // 🟡 Yellow: URL validation inference
      const invalidMetadata = {
        usageCount: 0,
        isFavorite: false,
        sourceUrl: 'not-a-valid-url',
      };

      const errors = PromptValidator.validateMetadata(invalidMetadata);

      expect(errors).toContain('Source URL must be a valid URL');
    });

    it('should validate ISO date format for lastUsedAt', () => {
      // 🟡 Yellow: Date validation inference
      const invalidMetadata = {
        usageCount: 0,
        isFavorite: false,
        lastUsedAt: 'not-a-date',
      };

      const errors = PromptValidator.validateMetadata(invalidMetadata);

      expect(errors).toContain('Last used date must be a valid ISO date string');
    });

    it('should handle optional fields correctly', () => {
      // 🟢 Blue: Optional fields from type definition
      const minimalMetadata = {
        usageCount: 0,
        isFavorite: false,
      };

      const errors = PromptValidator.validateMetadata(minimalMetadata);

      expect(errors).toEqual([]);
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should handle Unicode characters correctly', () => {
      // 🟡 Yellow: Internationalization consideration
      const unicodeRequest: CreatePromptRequest = {
        title: '日本語のタイトル 🚀',
        content: `English content
中文内容
🎯 Emoji content
Special chars: àáâãäå æç èéêë`,
      };

      const errors = PromptValidator.validateCreateRequest(unicodeRequest);

      expect(errors).toEqual([]);
    });

    it('should count Unicode characters correctly for limits', () => {
      // 🟡 Yellow: Character counting accuracy
      const unicodeTitle = '🚀'.repeat(201); // 201 emoji characters
      const invalidRequest: CreatePromptRequest = {
        title: unicodeTitle,
        content: 'Valid content',
      };

      const errors = PromptValidator.validateCreateRequest(invalidRequest);

      expect(errors).toContain('Prompt title cannot exceed 200 characters');
    });

    it('should handle very long lines in content', () => {
      // 🟡 Yellow: Edge case handling
      const singleLongLine = 'a'.repeat(5000);
      const validRequest: CreatePromptRequest = {
        title: 'Long Line Test',
        content: singleLongLine,
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should handle content with many line breaks', () => {
      // 🟢 Blue: Multi-line support requirement
      const manyLines = Array(1000).fill('line').join('\n');
      const validRequest: CreatePromptRequest = {
        title: 'Many Lines Test',
        content: manyLines,
      };

      const errors = PromptValidator.validateCreateRequest(validRequest);

      // Should pass as long as total character count is under limit
      expect(errors).not.toContain('Prompt content cannot exceed 10000 characters');
    });

    it('should validate against code injection attempts', () => {
      // 🔴 Red: Security consideration inference
      const potentiallyMaliciousContent = `
        <script>alert('xss')</script>
        javascript:void(0)
        <img src="x" onerror="alert('xss')">
      `;

      const request: CreatePromptRequest = {
        title: 'Security Test',
        content: potentiallyMaliciousContent,
      };

      // Should pass validation as content is stored as plain text
      const errors = PromptValidator.validateCreateRequest(request);

      expect(errors).toEqual([]);
    });
  });
});