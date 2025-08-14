// Test for PromptStorageAdapter
// TASK-0020: Background Script プロンプト管理統合

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptStorageAdapter } from '../../src/core/prompt-storage-adapter';
import type { CreatePromptRequest, Prompt } from '../../src/types';

// Mock StorageManager
vi.mock('../../src/core/storage-manager', () => {
  return {
    StorageManager: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getStorageInfo: vi.fn(),
    })),
  };
});

// Mock chrome.storage for consistency
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    getBytesInUse: vi.fn(),
  },
};

// Mock global chrome
(global as any).chrome = {
  storage: mockStorage,
};

describe('PromptStorageAdapter', () => {
  let adapter: PromptStorageAdapter;
  let mockStorageManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock storage manager instance
    mockStorageManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getStorageInfo: vi.fn().mockResolvedValue({
        bytesInUse: 0,
        quota: 5 * 1024 * 1024,
        availableSpace: 5 * 1024 * 1024,
        usagePercentage: 0,
      }),
    };

    // Mock the StorageManager constructor to return our mock
    const { StorageManager } = await import('../../src/core/storage-manager');
    vi.mocked(StorageManager).mockImplementation(() => mockStorageManager);

    adapter = new PromptStorageAdapter();
    
    // Default mock implementations for chrome storage (backup)
    mockStorage.local.get.mockResolvedValue({});
    mockStorage.local.set.mockResolvedValue(undefined);
    mockStorage.local.remove.mockResolvedValue(undefined);
    mockStorage.local.clear.mockResolvedValue(undefined);
    mockStorage.local.getBytesInUse.mockResolvedValue(0);
  });

  describe('savePrompt', () => {
    it('should save a new prompt successfully', async () => {
      const promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Prompt',
        content: 'This is a test prompt content',
        tags: ['test', 'sample'],
        categoryId: null,
        metadata: {
          usageCount: 0,
          lastUsedAt: null,
          isFavorite: false,
          sourceUrl: null,
          aiModel: null,
        },
      };

      // Mock empty prompts array initially
      mockStorageManager.get.mockResolvedValue([]);

      const savedPrompt = await adapter.savePrompt(promptData);

      expect(savedPrompt).toMatchObject({
        title: 'Test Prompt',
        content: 'This is a test prompt content',
        tags: ['test', 'sample'],
      });
      expect(savedPrompt.id).toBeDefined();
      expect(savedPrompt.createdAt).toBeDefined();
      expect(savedPrompt.updatedAt).toBeDefined();
      expect(mockStorageManager.set).toHaveBeenCalledWith('prompts', [savedPrompt]);
    });

    it('should validate prompt data before saving', async () => {
      const invalidPromptData: any = {
        title: '', // Empty title should fail validation
        content: 'Valid content',
        tags: [],
        categoryId: null,
        metadata: {},
      };

      mockStorage.local.get.mockResolvedValue({ prompts: [] });

      await expect(adapter.savePrompt(invalidPromptData)).rejects.toThrow('Validation failed');
    });

    it('should handle storage errors gracefully', async () => {
      const promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Prompt',
        content: 'This is a test prompt content',
        tags: [],
        categoryId: null,
        metadata: {
          usageCount: 0,
          lastUsedAt: null,
          isFavorite: false,
          sourceUrl: null,
          aiModel: null,
        },
      };

      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(adapter.savePrompt(promptData)).rejects.toThrow('Failed to save prompt');
    });
  });

  describe('getPrompt', () => {
    it('should retrieve an existing prompt by ID', async () => {
      const existingPrompt: Prompt = {
        id: 'test-id',
        title: 'Test Prompt',
        content: 'Test content',
        tags: ['test'],
        categoryId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          usageCount: 5,
          lastUsedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: false,
          sourceUrl: null,
          aiModel: null,
        },
      };

      mockStorage.local.get.mockResolvedValue({ prompts: [existingPrompt] });

      const result = await adapter.getPrompt('test-id');

      expect(result).toEqual(existingPrompt);
    });

    it('should return null for non-existent prompt', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [] });

      const result = await adapter.getPrompt('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const result = await adapter.getPrompt('test-id');

      expect(result).toBeNull();
    });
  });

  describe('updatePrompt', () => {
    const existingPrompt: Prompt = {
      id: 'test-id',
      title: 'Original Title',
      content: 'Original content',
      tags: ['original'],
      categoryId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      metadata: {
        usageCount: 0,
        lastUsedAt: null,
        isFavorite: false,
        sourceUrl: null,
        aiModel: null,
      },
    };

    it('should update an existing prompt', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [existingPrompt] });

      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const updatedPrompt = await adapter.updatePrompt('test-id', updates);

      expect(updatedPrompt.title).toBe('Updated Title');
      expect(updatedPrompt.content).toBe('Updated content');
      expect(updatedPrompt.id).toBe('test-id'); // ID should not change
      expect(updatedPrompt.createdAt).toBe(existingPrompt.createdAt); // Creation date should not change
      expect(updatedPrompt.updatedAt).not.toBe(existingPrompt.updatedAt); // Updated date should change
    });

    it('should throw error for non-existent prompt', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [] });

      const updates = { title: 'Updated Title' };

      await expect(adapter.updatePrompt('non-existent-id', updates)).rejects.toThrow('Prompt not found');
    });

    it('should validate updated prompt data', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [existingPrompt] });

      const invalidUpdates = { title: '' }; // Empty title should fail validation

      await expect(adapter.updatePrompt('test-id', invalidUpdates)).rejects.toThrow('Validation failed');
    });
  });

  describe('deletePrompt', () => {
    const existingPrompt: Prompt = {
      id: 'test-id',
      title: 'Test Prompt',
      content: 'Test content',
      tags: [],
      categoryId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      metadata: {
        usageCount: 0,
        lastUsedAt: null,
        isFavorite: false,
        sourceUrl: null,
        aiModel: null,
      },
    };

    it('should delete an existing prompt', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [existingPrompt] });

      const result = await adapter.deletePrompt('test-id');

      expect(result).toBe(true);
      expect(mockStorage.local.set).toHaveBeenCalledWith('prompts', []);
    });

    it('should return false for non-existent prompt', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [] });

      const result = await adapter.deletePrompt('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const result = await adapter.deletePrompt('test-id');

      expect(result).toBe(false);
    });
  });

  describe('searchPrompts', () => {
    const prompts: Prompt[] = [
      {
        id: 'prompt-1',
        title: 'JavaScript Tips',
        content: 'Here are some useful JavaScript tips',
        tags: ['javascript', 'programming'],
        categoryId: 'development',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {
          usageCount: 10,
          lastUsedAt: '2024-01-01T00:00:00.000Z',
          isFavorite: true,
          sourceUrl: null,
          aiModel: null,
        },
      },
      {
        id: 'prompt-2',
        title: 'Python Best Practices',
        content: 'Python coding best practices',
        tags: ['python', 'programming'],
        categoryId: 'development',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        metadata: {
          usageCount: 5,
          lastUsedAt: '2024-01-02T00:00:00.000Z',
          isFavorite: false,
          sourceUrl: null,
          aiModel: null,
        },
      },
    ];

    it('should search prompts by query', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts });

      const results = await adapter.searchPrompts({ query: 'javascript' });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Tips');
    });

    it('should search prompts by tags', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts });

      const results = await adapter.searchPrompts({ tags: ['programming'] });

      expect(results).toHaveLength(2);
    });

    it('should search prompts by category', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts });

      const results = await adapter.searchPrompts({ categoryId: 'development' });

      expect(results).toHaveLength(2);
    });

    it('should sort prompts by usage count', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts });

      const results = await adapter.searchPrompts({
        sortBy: 'usageCount',
        sortOrder: 'desc',
      });

      expect(results[0].metadata.usageCount).toBe(10);
      expect(results[1].metadata.usageCount).toBe(5);
    });

    it('should apply pagination', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts });

      const results = await adapter.searchPrompts({
        limit: 1,
        offset: 0,
      });

      expect(results).toHaveLength(1);
    });

    it('should handle empty search results', async () => {
      mockStorage.local.get.mockResolvedValue({ prompts: [] });

      const results = await adapter.searchPrompts({ query: 'nonexistent' });

      expect(results).toHaveLength(0);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const results = await adapter.searchPrompts({});

      expect(results).toHaveLength(0);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockPrompts: Prompt[] = [
        {
          id: 'test-1',
          title: 'Test',
          content: 'Content',
          tags: [],
          categoryId: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {
            usageCount: 0,
            lastUsedAt: null,
            isFavorite: false,
            sourceUrl: null,
            aiModel: null,
          },
        },
      ];

      mockStorage.local.get
        .mockResolvedValueOnce({ prompts: mockPrompts }) // For getAllPrompts
        .mockResolvedValueOnce(null) // For getBytesInUse
        .mockResolvedValueOnce({ lastUpdated: '2024-01-01T00:00:00.000Z' }); // For metadata

      mockStorage.local.getBytesInUse.mockResolvedValue(1024);

      const stats = await adapter.getStorageStats();

      expect(stats).toMatchObject({
        totalPrompts: 1,
        storageUsage: 1024,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should handle errors gracefully', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const stats = await adapter.getStorageStats();

      expect(stats).toMatchObject({
        totalPrompts: 0,
        storageUsage: 0,
        availableSpace: 0,
        lastUpdated: null,
      });
    });
  });

  describe('clearAllPrompts', () => {
    it('should clear all prompts successfully', async () => {
      const result = await adapter.clearAllPrompts();

      expect(result).toBe(true);
      expect(mockStorage.local.set).toHaveBeenCalledWith('prompts', []);
      expect(mockStorage.local.remove).toHaveBeenCalledWith('prompt_metadata');
    });

    it('should handle errors gracefully', async () => {
      mockStorage.local.set.mockRejectedValue(new Error('Storage error'));

      const result = await adapter.clearAllPrompts();

      expect(result).toBe(false);
    });
  });
});