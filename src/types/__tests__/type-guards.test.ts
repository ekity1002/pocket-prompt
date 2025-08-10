// Type Guards Test Suite
// TASK-0005: Runtime type validation tests

import {
  isPrompt,
  isPromptMetadata,
  isSupportedAISite,
  isExportFormat,
  isUserSettings,
  isFeatureFlags,
  isChromeMessage,
  isConversationExport,
  isConversationData,
  isConversationMessage,
  validatePromptContent,
  validatePromptTitle,
  validateTags,
  validateCreatePromptRequest,
  createDefaultUserSettings,
  createDefaultPromptMetadata,
  generatePromptId,
  generateRequestId,
  POCKET_PROMPT_CONSTANTS,
  type Prompt,
  type PromptMetadata,
  type UserSettings,
  type FeatureFlags,
  type ChromeMessage,
  type ConversationExport,
  type ConversationData,
  type ConversationMessage,
  type CreatePromptRequest,
} from '../index';

describe('Type Guards', () => {
  describe('isPrompt', () => {
    it('should validate valid Prompt objects', () => {
      const validPrompt: Prompt = {
        id: 'test-id',
        title: 'Test Prompt',
        content: 'Test content',
        tags: ['test', 'example'],
        categoryId: 'cat-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        metadata: {
          usageCount: 0,
          lastUsedAt: null,
          isFavorite: false,
          sourceUrl: null,
          aiModel: null,
        },
      };

      expect(isPrompt(validPrompt)).toBe(true);
    });

    it('should reject invalid Prompt objects', () => {
      const invalidPrompts = [
        null,
        undefined,
        'string',
        123,
        {},
        { id: 'test' }, // Missing required fields
        {
          id: 'test',
          title: 'Test',
          content: 'Test',
          tags: 'not-array', // Invalid tags type
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          metadata: {},
        },
      ];

      invalidPrompts.forEach((invalid) => {
        expect(isPrompt(invalid)).toBe(false);
      });
    });
  });

  describe('isPromptMetadata', () => {
    it('should validate valid PromptMetadata objects', () => {
      const validMetadata: PromptMetadata = {
        usageCount: 5,
        lastUsedAt: '2024-01-01T00:00:00Z',
        isFavorite: true,
        sourceUrl: 'https://example.com',
        aiModel: 'gpt-4',
        description: 'Test prompt',
        author: 'Test User',
        version: '1.0.0',
        isPrivate: false,
      };

      expect(isPromptMetadata(validMetadata)).toBe(true);
    });

    it('should validate minimal PromptMetadata objects', () => {
      const minimalMetadata: PromptMetadata = {
        usageCount: 0,
        isFavorite: false,
      };

      expect(isPromptMetadata(minimalMetadata)).toBe(true);
    });

    it('should reject invalid PromptMetadata objects', () => {
      const invalidMetadata = [
        null,
        {},
        { usageCount: 'not-number', isFavorite: false },
        { usageCount: 0, isFavorite: 'not-boolean' },
        { usageCount: 0 }, // Missing required isFavorite
      ];

      invalidMetadata.forEach((invalid) => {
        expect(isPromptMetadata(invalid)).toBe(false);
      });
    });
  });

  describe('isSupportedAISite', () => {
    it('should validate supported AI sites', () => {
      expect(isSupportedAISite('chatgpt')).toBe(true);
      expect(isSupportedAISite('claude')).toBe(true);
      expect(isSupportedAISite('gemini')).toBe(true);
    });

    it('should reject unsupported AI sites', () => {
      expect(isSupportedAISite('unsupported')).toBe(false);
      expect(isSupportedAISite('')).toBe(false);
      expect(isSupportedAISite(null)).toBe(false);
      expect(isSupportedAISite(123)).toBe(false);
    });
  });

  describe('isExportFormat', () => {
    it('should validate supported export formats', () => {
      expect(isExportFormat('markdown')).toBe(true);
      expect(isExportFormat('json')).toBe(true);
      expect(isExportFormat('txt')).toBe(true);
      expect(isExportFormat('csv')).toBe(true);
    });

    it('should reject unsupported export formats', () => {
      expect(isExportFormat('pdf')).toBe(false);
      expect(isExportFormat('xml')).toBe(false);
      expect(isExportFormat('')).toBe(false);
      expect(isExportFormat(null)).toBe(false);
    });
  });

  describe('isUserSettings', () => {
    it('should validate valid UserSettings objects', () => {
      const validSettings: UserSettings = {
        theme: 'dark',
        language: 'en',
        features: {
          tagManagement: true,
          searchFiltering: true,
          aiSiteIntegration: true,
          cloudSync: false,
          multiAiSupport: true,
        },
      };

      expect(isUserSettings(validSettings)).toBe(true);
    });

    it('should reject invalid UserSettings objects', () => {
      const invalidSettings = [
        null,
        {},
        { theme: 'invalid-theme', language: 'en', features: {} },
        { theme: 'light', language: 'invalid-lang', features: {} },
        { theme: 'light', language: 'en' }, // Missing features
      ];

      invalidSettings.forEach((invalid) => {
        expect(isUserSettings(invalid)).toBe(false);
      });
    });
  });

  describe('isFeatureFlags', () => {
    it('should validate valid FeatureFlags objects', () => {
      const validFlags: FeatureFlags = {
        tagManagement: true,
        searchFiltering: false,
        aiSiteIntegration: true,
        cloudSync: false,
        multiAiSupport: true,
      };

      expect(isFeatureFlags(validFlags)).toBe(true);
    });

    it('should reject invalid FeatureFlags objects', () => {
      const invalidFlags = [
        null,
        {},
        { tagManagement: 'not-boolean' },
        { tagManagement: true }, // Missing required fields
      ];

      invalidFlags.forEach((invalid) => {
        expect(isFeatureFlags(invalid)).toBe(false);
      });
    });
  });
});

describe('Validation Functions', () => {
  describe('validatePromptContent', () => {
    it('should pass valid content', () => {
      expect(validatePromptContent('Valid content')).toEqual([]);
      expect(validatePromptContent('Short')).toEqual([]);
    });

    it('should reject empty content', () => {
      expect(validatePromptContent('')).toContain('Prompt content cannot be empty');
      expect(validatePromptContent('   ')).toContain('Prompt content cannot be empty');
    });

    it('should reject content that exceeds length limit', () => {
      const longContent = 'a'.repeat(POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH + 1);
      const errors = validatePromptContent(longContent);
      expect(errors).toContain(
        `Prompt content cannot exceed ${POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH} characters`
      );
    });
  });

  describe('validatePromptTitle', () => {
    it('should pass valid titles', () => {
      expect(validatePromptTitle('Valid Title')).toEqual([]);
      expect(validatePromptTitle('Short')).toEqual([]);
    });

    it('should reject empty titles', () => {
      expect(validatePromptTitle('')).toContain('Prompt title cannot be empty');
      expect(validatePromptTitle('   ')).toContain('Prompt title cannot be empty');
    });

    it('should reject titles that exceed length limit', () => {
      const longTitle = 'a'.repeat(201);
      const errors = validatePromptTitle(longTitle);
      expect(errors).toContain('Prompt title cannot exceed 200 characters');
    });
  });

  describe('validateTags', () => {
    it('should pass valid tags', () => {
      expect(validateTags(['tag1', 'tag2', 'valid-tag'])).toEqual([]);
      expect(validateTags([])).toEqual([]);
    });

    it('should reject too many tags', () => {
      const tooManyTags = Array.from(
        { length: POCKET_PROMPT_CONSTANTS.MAX_TAG_COUNT + 1 },
        (_, i) => `tag${i}`
      );
      const errors = validateTags(tooManyTags);
      expect(errors).toContain(
        `Cannot have more than ${POCKET_PROMPT_CONSTANTS.MAX_TAG_COUNT} tags`
      );
    });

    it('should reject empty tags', () => {
      const errors = validateTags(['valid', '', 'another']);
      expect(errors).toContain('Tags cannot be empty');
    });

    it('should reject tags with invalid characters', () => {
      const errors = validateTags(['valid', 'invalid@tag', 'another']);
      expect(errors).toContain('Tag "invalid@tag" contains invalid characters');
    });

    it('should reject duplicate tags', () => {
      const errors = validateTags(['tag1', 'TAG1', 'tag2']); // Case insensitive duplicates
      expect(errors).toContain('Duplicate tags are not allowed');
    });

    it('should reject tags that exceed length limit', () => {
      const longTag = 'a'.repeat(POCKET_PROMPT_CONSTANTS.MAX_TAG_LENGTH + 1);
      const errors = validateTags([longTag]);
      expect(errors).toContain(
        `Tag \"${longTag}\" exceeds ${POCKET_PROMPT_CONSTANTS.MAX_TAG_LENGTH} characters`
      );
    });
  });

  describe('validateCreatePromptRequest', () => {
    it('should validate valid requests', () => {
      const validRequest: CreatePromptRequest = {
        title: 'Valid Title',
        content: 'Valid content',
        tags: ['tag1', 'tag2'],
        categoryId: 'cat-1',
      };

      expect(validateCreatePromptRequest(validRequest)).toBe(true);
    });

    it('should reject invalid requests', () => {
      const invalidRequests = [
        null,
        {},
        { title: '', content: 'Valid content' }, // Empty title
        { title: 'Valid Title', content: '' }, // Empty content
        { title: 'Valid Title', content: 'Valid content', tags: [''] }, // Empty tag
      ];

      invalidRequests.forEach((invalid) => {
        expect(validateCreatePromptRequest(invalid)).toBe(false);
      });
    });
  });
});

describe('Factory Functions', () => {
  describe('createDefaultUserSettings', () => {
    it('should create valid default settings', () => {
      const settings = createDefaultUserSettings();
      expect(isUserSettings(settings)).toBe(true);
      expect(settings.theme).toBe('auto');
      expect(settings.language).toBe(POCKET_PROMPT_CONSTANTS.DEFAULT_LANGUAGE);
      expect(settings.features.cloudSync).toBe(false); // Should be disabled by default
    });
  });

  describe('createDefaultPromptMetadata', () => {
    it('should create valid default metadata', () => {
      const metadata = createDefaultPromptMetadata();
      expect(isPromptMetadata(metadata)).toBe(true);
      expect(metadata.usageCount).toBe(0);
      expect(metadata.isFavorite).toBe(false);
      expect(metadata.lastUsedAt).toBe(null);
    });
  });

  describe('generatePromptId', () => {
    it('should generate unique IDs', () => {
      const id1 = generatePromptId();
      const id2 = generatePromptId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^prompt_\\d+_[a-z0-9]+$/);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\\d+_[a-z0-9]+$/);
    });
  });
});

describe('Constants', () => {
  it('should have valid storage limits', () => {
    expect(POCKET_PROMPT_CONSTANTS.MAX_STORAGE_SIZE).toBe(5 * 1024 * 1024);
    expect(POCKET_PROMPT_CONSTANTS.MAX_PROMPTS_COUNT).toBeGreaterThan(0);
    expect(POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH).toBeGreaterThan(0);
  });

  it('should have valid supported AI sites', () => {
    expect(POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES).toEqual(['chatgpt', 'claude', 'gemini']);
  });

  it('should have valid export formats', () => {
    expect(POCKET_PROMPT_CONSTANTS.EXPORT_FORMATS).toEqual(['markdown', 'json', 'txt', 'csv']);
  });

  it('should have valid themes and languages', () => {
    expect(POCKET_PROMPT_CONSTANTS.THEMES).toEqual(['light', 'dark', 'auto']);
    expect(POCKET_PROMPT_CONSTANTS.LANGUAGES).toEqual(['ja', 'en']);
  });

  it('should have site selectors for all supported AI sites', () => {
    POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES.forEach((site) => {
      expect(POCKET_PROMPT_CONSTANTS.SITE_SELECTORS[site]).toBeDefined();
      expect(POCKET_PROMPT_CONSTANTS.SITE_SELECTORS[site].textarea).toBeTruthy();
      expect(POCKET_PROMPT_CONSTANTS.SITE_SELECTORS[site].conversation).toBeTruthy();
      expect(POCKET_PROMPT_CONSTANTS.SITE_SELECTORS[site].url).toBeTruthy();
    });
  });

  it('should have all required error codes', () => {
    const requiredErrorCodes = [
      'STORAGE_QUOTA_EXCEEDED',
      'INVALID_PROMPT_DATA',
      'AI_SITE_NOT_DETECTED',
      'EXPORT_FAILED',
      'NETWORK_ERROR',
      'PERMISSION_DENIED',
    ];

    requiredErrorCodes.forEach((code) => {
      expect(
        POCKET_PROMPT_CONSTANTS.ERROR_CODES[
          code as keyof typeof POCKET_PROMPT_CONSTANTS.ERROR_CODES
        ]
      ).toBe(code);
    });
  });
});
