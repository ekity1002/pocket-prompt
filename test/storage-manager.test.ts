// StorageManager Test Suite
// TASK-0006: TDD Test Cases for Storage Management

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { StorageManager } from '@/utils/storage';
import type { Prompt, Settings, StorageData } from '@/types';

// Chrome API Mock Setup
const mockChromeStorageSync = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  getBytesInUse: vi.fn(),
};

// Extend existing chrome mock with storage-specific mocks
if (global.chrome?.storage?.sync) {
  Object.assign(global.chrome.storage.sync, mockChromeStorageSync);
} else {
  Object.defineProperty(global, 'chrome', {
    value: {
      storage: {
        sync: mockChromeStorageSync,
      },
      runtime: {
        id: 'test-extension-id',
        getManifest: vi.fn(() => ({ version: '1.0.0' })),
      },
    },
    writable: true,
  });
}

// Test Data Fixtures
const mockPrompt: Prompt = {
  id: 'test-prompt-1',
  title: 'Test Prompt Title',
  content: 'This is a test prompt content',
  category: 'test-category',
  tags: ['test', 'sample'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockSettings: Settings = {
  theme: 'dark',
  autoSave: true,
  syncEnabled: true,
  autoTag: false,
  exportFormat: 'json',
  shortcuts: {
    capture: 'Alt+Shift+C',
    toggle: 'Alt+Shift+P',
  },
};

describe('StorageManager - Basic CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock responses
    mockChromeStorageSync.get.mockResolvedValue({});
    mockChromeStorageSync.set.mockResolvedValue(undefined);
    mockChromeStorageSync.clear.mockResolvedValue(undefined);
    mockChromeStorageSync.getBytesInUse.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('🟢 Basic Prompt Operations', () => {
    it('should get empty prompts array when no prompts exist', async () => {
      mockChromeStorageSync.get.mockResolvedValue({}); // Empty result

      const prompts = await StorageManager.getPrompts();

      expect(prompts).toEqual([]);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['prompts']);
    });

    it('should get existing prompts from storage', async () => {
      const existingPrompts = [mockPrompt];
      mockChromeStorageSync.get.mockResolvedValue({ prompts: existingPrompts });

      const prompts = await StorageManager.getPrompts();

      expect(prompts).toEqual(existingPrompts);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['prompts']);
    });

    it('should save a new prompt successfully', async () => {
      const existingPrompts = [mockPrompt];
      mockChromeStorageSync.get
        .mockResolvedValueOnce({ prompts: existingPrompts }) // getPrompts call
        .mockResolvedValueOnce({ categories: [] }) // getCategories call
        .mockResolvedValueOnce({ tags: [] }); // getTags call

      const newPromptData = {
        title: 'New Test Prompt',
        content: 'New test content',
        category: 'new-category',
        tags: ['new', 'tag'],
      };

      const savedPrompt = await StorageManager.savePrompt(newPromptData);

      expect(savedPrompt).toMatchObject({
        ...newPromptData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify storage calls
      expect(mockChromeStorageSync.set).toHaveBeenCalledTimes(3); // prompts, categories, tags
    });

    it('should update an existing prompt successfully', async () => {
      const existingPrompts = [mockPrompt];
      mockChromeStorageSync.get
        .mockResolvedValueOnce({ prompts: existingPrompts })
        .mockResolvedValueOnce({ categories: [] })
        .mockResolvedValueOnce({ tags: [] });

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

      expect(mockChromeStorageSync.set).toHaveBeenCalledTimes(3);
    });

    it('should delete a prompt successfully', async () => {
      const existingPrompts = [mockPrompt, { ...mockPrompt, id: 'prompt-2' }];
      mockChromeStorageSync.get.mockResolvedValue({ prompts: existingPrompts });

      await StorageManager.deletePrompt(mockPrompt.id);

      expect(mockChromeStorageSync.set).toHaveBeenCalledWith({
        prompts: [{ ...mockPrompt, id: 'prompt-2' }],
      });
    });

    it('should throw error when updating non-existent prompt', async () => {
      mockChromeStorageSync.get.mockResolvedValue({ prompts: [] });

      await expect(
        StorageManager.updatePrompt('non-existent-id', { title: 'Updated' })
      ).rejects.toThrow('Prompt not found');
    });
  });

  describe('🟢 Settings Operations', () => {
    it('should get default settings when no settings exist', async () => {
      mockChromeStorageSync.get.mockResolvedValue({});

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

    it('should get existing settings from storage', async () => {
      mockChromeStorageSync.get.mockResolvedValue({ settings: mockSettings });

      const settings = await StorageManager.getSettings();

      expect(settings).toEqual(mockSettings);
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
      mockChromeStorageSync.get.mockResolvedValue({ settings: currentSettings });

      const updates = { theme: 'light' as const };
      const updatedSettings = await StorageManager.saveSettings(updates);

      expect(updatedSettings).toEqual({ ...currentSettings, ...updates });
      expect(mockChromeStorageSync.set).toHaveBeenCalledWith({
        settings: { ...currentSettings, ...updates },
      });
    });
  });

  describe('🟢 Categories and Tags Operations', () => {
    it('should get empty categories array when no categories exist', async () => {
      mockChromeStorageSync.get.mockResolvedValue({});

      const categories = await StorageManager.getCategories();

      expect(categories).toEqual([]);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['categories']);
    });

    it('should get existing categories from storage', async () => {
      const existingCategories = ['cat1', 'cat2'];
      mockChromeStorageSync.get.mockResolvedValue({ categories: existingCategories });

      const categories = await StorageManager.getCategories();

      expect(categories).toEqual(existingCategories);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['categories']);
    });

    it('should get empty tags array when no tags exist', async () => {
      mockChromeStorageSync.get.mockResolvedValue({});

      const tags = await StorageManager.getTags();

      expect(tags).toEqual([]);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['tags']);
    });

    it('should get existing tags from storage', async () => {
      const existingTags = ['tag1', 'tag2'];
      mockChromeStorageSync.get.mockResolvedValue({ tags: existingTags });

      const tags = await StorageManager.getTags();

      expect(tags).toEqual(existingTags);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(['tags']);
    });
  });

  describe('🟢 Data Export/Import Operations', () => {
    it('should export all data successfully', async () => {
      const mockStorageData: StorageData = {
        prompts: [mockPrompt],
        settings: mockSettings,
        categories: ['test-category'],
        tags: ['test', 'sample'],
      };
      mockChromeStorageSync.get.mockResolvedValue(mockStorageData);

      const exportedData = await StorageManager.exportData();

      expect(exportedData).toEqual(mockStorageData);
      expect(mockChromeStorageSync.get).toHaveBeenCalledWith(null);
    });

    it('should import data successfully', async () => {
      const importData: StorageData = {
        prompts: [mockPrompt],
        settings: mockSettings,
        categories: ['imported-category'],
        tags: ['imported', 'tags'],
      };

      await StorageManager.importData(importData);

      expect(mockChromeStorageSync.clear).toHaveBeenCalledTimes(1);
      expect(mockChromeStorageSync.set).toHaveBeenCalledWith(importData);
    });
  });

  describe('🟢 Large Data Processing Tests', () => {
    it('should handle saving multiple prompts efficiently', async () => {
      const existingPrompts: Prompt[] = [];
      mockChromeStorageSync.get
        .mockResolvedValue({ prompts: existingPrompts })
        .mockResolvedValue({ categories: [] })
        .mockResolvedValue({ tags: [] });

      const promptsToSave = Array.from({ length: 100 }, (_, i) => ({
        title: `Prompt ${i}`,
        content: `Content for prompt ${i}`,
        category: `category-${i % 10}`,
        tags: [`tag-${i}`, `common-tag`],
      }));

      const savePromises = promptsToSave.map((promptData) => StorageManager.savePrompt(promptData));

      const savedPrompts = await Promise.all(savePromises);

      expect(savedPrompts).toHaveLength(100);
      savedPrompts.forEach((prompt, index) => {
        expect(prompt.title).toBe(`Prompt ${index}`);
        expect(prompt.id).toBeTruthy();
        expect(prompt.createdAt).toBeTruthy();
        expect(prompt.updatedAt).toBeTruthy();
      });
    });

    it('should handle bulk operations without performance degradation', async () => {
      const largePromptArray = Array.from({ length: 500 }, (_, i) => ({
        ...mockPrompt,
        id: `prompt-${i}`,
        title: `Prompt ${i}`,
      }));

      mockChromeStorageSync.get.mockResolvedValue({ prompts: largePromptArray });

      const startTime = performance.now();
      const prompts = await StorageManager.getPrompts();
      const endTime = performance.now();

      expect(prompts).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
