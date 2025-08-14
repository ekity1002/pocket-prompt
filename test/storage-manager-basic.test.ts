// StorageManager Basic Test Suite (Simplified)
// TASK-0006: TDD Basic Test Cases with proper mocking

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { StorageManager } from '@/utils/storage';
import type { Prompt } from '@/types';

// Test Data Fixtures
const mockPrompt: Prompt = {
  id: 'test-prompt-1',
  title: 'Test Prompt Title',
  content: 'This is a test prompt content',
  categoryId: 'test-category',
  tags: ['test', 'sample'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  metadata: { usageCount: 5, isFavorite: true },
};

describe('StorageManager - Basic CRUD Operations (Fixed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chrome.storage.local for each test
    if (chrome?.storage?.local) {
      chrome.storage.local.get = vi.fn();
      chrome.storage.local.set = vi.fn();
      chrome.storage.local.clear = vi.fn();
      chrome.storage.local.getBytesInUse = vi.fn();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🟢 Basic Prompt Operations', () => {
    it('should get empty prompts array when no prompts exist', async () => {
      // Setup mock to return empty object (no prompts key)
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      const prompts = await StorageManager.getPrompts();

      expect(prompts).toEqual([]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['prompts']);
    });

    it('should get existing prompts from storage', async () => {
      const existingPrompts = [mockPrompt];
      chrome.storage.local.get = vi.fn().mockResolvedValue({ prompts: existingPrompts });

      const prompts = await StorageManager.getPrompts();

      expect(prompts).toEqual(existingPrompts);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['prompts']);
    });

    it('should save a new prompt successfully', async () => {
      // Mock the sequence of calls that savePrompt makes
      chrome.storage.local.get = vi
        .fn()
        .mockResolvedValueOnce({ prompts: [] }) // getPrompts call
        .mockResolvedValueOnce({ categories: [] }) // getCategories for updateCategoriesAndTags
        .mockResolvedValueOnce({ tags: [] }); // getTags for updateCategoriesAndTags

      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      const newPromptData = {
        title: 'New Test Prompt',
        content: 'New test content',
        categoryId: 'new-category',
        tags: ['new', 'tag'],
        metadata: { usageCount: 0, isFavorite: false },
      };

      const savedPrompt = await StorageManager.savePrompt(newPromptData);

      expect(savedPrompt).toMatchObject({
        ...newPromptData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify storage calls - should be called 3 times (prompts, categories, tags)
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
    });

    it('should update an existing prompt successfully', async () => {
      const existingPrompts = [mockPrompt];
      chrome.storage.local.get = vi
        .fn()
        .mockResolvedValueOnce({ prompts: existingPrompts }) // getPrompts call
        .mockResolvedValueOnce({ categories: ['test-category'] }) // getCategories call
        .mockResolvedValueOnce({ tags: ['test', 'sample'] }); // getTags call

      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      const updates = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const updatedPrompt = await StorageManager.updatePrompt(mockPrompt.id, updates);

      expect(updatedPrompt).toMatchObject({
        ...mockPrompt,
        ...updates,
        updatedAt: expect.any(String),
      });

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });

    it('should delete a prompt successfully', async () => {
      const existingPrompts = [mockPrompt, { ...mockPrompt, id: 'prompt-2' }];
      chrome.storage.local.get = vi.fn().mockResolvedValue({ prompts: existingPrompts });
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await StorageManager.deletePrompt(mockPrompt.id);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        prompts: [{ ...mockPrompt, id: 'prompt-2' }],
      });
    });

    it('should throw error when updating non-existent prompt', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({ prompts: [] });

      await expect(
        StorageManager.updatePrompt('non-existent-id', { title: 'Updated' })
      ).rejects.toThrow('Prompt not found');
    });
  });

  describe('🟢 Settings Operations', () => {
    it('should get default settings when no settings exist', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      const settings = await StorageManager.getSettings();

      expect(settings).toMatchObject({
        theme: 'system',
        autoSave: true,
        syncEnabled: true,
        autoTag: true,
        exportFormat: 'json',
        shortcuts: expect.any(Object),
      });
    });

    it('should save settings successfully', async () => {
      const currentSettings = {
        theme: 'dark' as const,
        autoSave: true,
        syncEnabled: true,
        autoTag: false,
        exportFormat: 'json' as const,
        shortcuts: {
          capture: 'Alt+Shift+C',
          toggle: 'Alt+Shift+P',
        },
      };

      chrome.storage.local.get = vi.fn().mockResolvedValue({ settings: currentSettings });
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      const updates = { theme: 'light' as const };
      const updatedSettings = await StorageManager.saveSettings(updates);

      expect(updatedSettings).toEqual({ ...currentSettings, ...updates });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: { ...currentSettings, ...updates },
      });
    });
  });

  describe('🟢 Categories and Tags Operations', () => {
    it('should get empty categories array when no categories exist', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      const categories = await StorageManager.getCategories();

      expect(categories).toEqual([]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['categories']);
    });

    it('should get existing categories from storage', async () => {
      const existingCategories = ['cat1', 'cat2'];
      chrome.storage.local.get = vi.fn().mockResolvedValue({ categories: existingCategories });

      const categories = await StorageManager.getCategories();

      expect(categories).toEqual(existingCategories);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['categories']);
    });

    it('should get empty tags array when no tags exist', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      const tags = await StorageManager.getTags();

      expect(tags).toEqual([]);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['tags']);
    });

    it('should get existing tags from storage', async () => {
      const existingTags = ['tag1', 'tag2'];
      chrome.storage.local.get = vi.fn().mockResolvedValue({ tags: existingTags });

      const tags = await StorageManager.getTags();

      expect(tags).toEqual(existingTags);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['tags']);
    });
  });
});
