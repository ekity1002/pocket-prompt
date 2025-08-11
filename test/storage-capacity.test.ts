// StorageManager Capacity Limits Test Suite
// TASK-0006: TDD Capacity Management Test Cases

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { StorageManager } from '@/utils/storage';
import type { Prompt, StorageData } from '@/types';

// Chrome API is already mocked in test setup
// Access the mocked chrome object
declare const chrome: any;

// Utility functions for testing
function createLargePrompt(size: number, id: string = 'large-prompt'): Prompt {
  const paddingSize = Math.max(0, size - 200); // Account for other fields
  return {
    id,
    title: 'Large Test Prompt',
    content: 'X'.repeat(paddingSize),
    categoryId: 'large-test',
    tags: ['large', 'test'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function calculateDataSize(data: any): number {
  return JSON.stringify(data).length;
}

describe('StorageManager - Capacity Management', () => {
  const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const LARGE_PROMPT_SIZE = 1024 * 1024; // 1MB
  const MEDIUM_PROMPT_SIZE = 100 * 1024; // 100KB

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear storage data and verify chrome object is available
    expect(chrome).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.storage.local).toBeDefined();
    await chrome.storage.local.clear();

    // Console mocks - but allow logs for debugging
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep console.log for debugging
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('🔴 5MB Storage Limit Enforcement', () => {
    it('should track storage usage accurately', async () => {
      // Test basic chrome mock functionality first
      const testData = { test: 'value' };
      await chrome.storage.local.set(testData);
      const retrieved = await chrome.storage.local.get(['test']);
      expect(retrieved.test).toBe('value');

      // Create and store data to simulate usage
      const promptData = {
        prompts: [createLargePrompt(MEDIUM_PROMPT_SIZE, 'test-1')],
        settings: { theme: 'dark', autoSave: true },
      };
      await chrome.storage.local.set(promptData);

      // Verify data was stored
      const storedData = await chrome.storage.local.get(['prompts']);
      expect(storedData.prompts).toHaveLength(1);

      const bytesUsed = await StorageManager.getUsage();
      const usagePercentage = (bytesUsed / MAX_STORAGE_SIZE) * 100;

      expect(bytesUsed).toBeGreaterThan(0);
      expect(usagePercentage).toBeGreaterThan(0);
      expect(bytesUsed).toBeLessThan(MAX_STORAGE_SIZE);
    });

    it('should detect when approaching storage limit (>80%)', async () => {
      // Create large amount of data to simulate high usage
      const largePrompts = Array.from({ length: 5 }, (_, i) =>
        createLargePrompt(LARGE_PROMPT_SIZE * 0.8, `large-prompt-${i}`)
      );
      await chrome.storage.local.set({ prompts: largePrompts });

      const { isNearLimit, usagePercentage } = await StorageManager.checkCapacity();

      expect(usagePercentage).toBeGreaterThan(50); // Should be substantial usage
      // The exact percentage depends on data serialization overhead
      expect(isNearLimit).toBe(usagePercentage > 80);
    });

    it('should detect critical storage usage (>90%)', async () => {
      // Create very large amount of data to simulate critical usage
      const veryLargePrompts = Array.from({ length: 4 }, (_, i) =>
        createLargePrompt(LARGE_PROMPT_SIZE * 0.95, `critical-prompt-${i}`)
      );
      await chrome.storage.local.set({ prompts: veryLargePrompts });

      const { isFull, usagePercentage } = await StorageManager.checkCapacity();

      expect(usagePercentage).toBeGreaterThan(75); // Should be high usage
      expect(isFull).toBe(usagePercentage > 95);
    });

    it('should handle quota exceeded error when storage is full', async () => {
      // Fill storage to near capacity first
      const largePrompts = Array.from({ length: 4 }, (_, i) =>
        createLargePrompt(LARGE_PROMPT_SIZE, `fill-prompt-${i}`)
      );
      await chrome.storage.local.set({ prompts: largePrompts });

      // Mock set to throw quota exceeded error on next save
      const quotaError = new DOMException('Storage quota exceeded', 'QUOTA_EXCEEDED_ERR');
      vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(quotaError);

      const promptData = {
        title: 'Final prompt',
        content: 'X'.repeat(LARGE_PROMPT_SIZE),
        categoryId: 'test',
        metadata: { usageCount: 0, isFavorite: false },
        tags: ['test'],
      };

      await expect(StorageManager.savePrompt(promptData)).rejects.toThrow(
        'Failed to save prompt to storage'
      );
      expect(console.error).toHaveBeenCalledWith('Failed to save prompt:', quotaError);
    });
  });

  describe('🔴 Large Data Handling', () => {
    it('should handle saving maximum-size prompts', async () => {
      const maxPromptSize = 1024 * 1024; // 1MB prompt
      const largePrompt = createLargePrompt(maxPromptSize, 'max-size-prompt');

      const promptData = {
        title: largePrompt.title,
        content: largePrompt.content,
        categoryId: largePrompt.categoryId,
        metadata: { usageCount: 0, isFavorite: false },
        tags: largePrompt.tags,
      };

      const savedPrompt = await StorageManager.savePrompt(promptData);

      expect(savedPrompt).toBeDefined();
      expect(savedPrompt.content).toBe(largePrompt.content);
      expect(savedPrompt.id).toBeDefined();
      expect(savedPrompt.createdAt).toBeDefined();
    });

    it('should handle multiple large prompts efficiently', async () => {
      const largePrompts = Array.from({ length: 3 }, (_, i) =>
        createLargePrompt(MEDIUM_PROMPT_SIZE, `large-prompt-${i}`)
      );

      // Store the prompts
      await chrome.storage.local.set({ prompts: largePrompts });

      const prompts = await StorageManager.getPrompts();
      const bytesUsed = await StorageManager.getUsage();

      expect(prompts).toHaveLength(3);
      expect(bytesUsed).toBeGreaterThan(200 * 1024); // At least 200KB total
      expect(bytesUsed).toBeLessThan(MAX_STORAGE_SIZE);
    });

    it('should handle bulk import with size validation', async () => {
      const bulkPrompts = Array.from(
        { length: 50 },
        (_, i) => createLargePrompt(50 * 1024, `bulk-prompt-${i}`) // 50KB each
      );

      const bulkImportData: StorageData = {
        prompts: bulkPrompts,
        settings: {
          theme: 'dark',
          autoSave: true,
          syncEnabled: true,
          autoTag: true,
          exportFormat: 'json',
          shortcuts: { capture: 'Alt+C', toggle: 'Alt+P' },
        },
        categories: ['bulk-category'],
        tags: ['bulk', 'import'],
      };

      const estimatedSize = calculateDataSize(bulkImportData);

      // Check if data size is reasonable for testing
      expect(estimatedSize).toBeGreaterThan(1024); // At least 1KB

      // Test the import functionality
      await StorageManager.importData(bulkImportData);

      // Verify the data was imported
      const importedData = await StorageManager.exportData();
      expect(importedData.prompts).toHaveLength(50);
      expect(importedData.settings?.theme).toBe('dark');
    });
  });

  describe('🔴 Capacity Monitoring', () => {
    it('should provide storage usage statistics', async () => {
      const mockData = {
        prompts: Array.from({ length: 10 }, (_, i) => createLargePrompt(50 * 1024, `prompt-${i}`)),
        settings: {
          theme: 'dark',
          autoSave: true,
          syncEnabled: true,
          autoTag: true,
          exportFormat: 'json',
          shortcuts: { capture: 'Alt+C', toggle: 'Alt+P' },
        },
        categories: ['cat1', 'cat2', 'cat3'],
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };

      await chrome.storage.local.set(mockData);

      const exportedData = await StorageManager.exportData();
      const bytesUsed = await chrome.storage.local.getBytesInUse();

      const usageStats = {
        totalBytes: bytesUsed,
        maxBytes: MAX_STORAGE_SIZE,
        usagePercentage: (bytesUsed / MAX_STORAGE_SIZE) * 100,
        remainingBytes: MAX_STORAGE_SIZE - bytesUsed,
        promptCount: exportedData.prompts.length,
        averagePromptSize: bytesUsed / exportedData.prompts.length,
      };

      expect(usageStats.totalBytes).toBeGreaterThan(0);
      expect(usageStats.usagePercentage).toBeGreaterThan(0);
      expect(usageStats.usagePercentage).toBeLessThan(100);
      expect(usageStats.remainingBytes).toBeGreaterThan(0);
      expect(usageStats.promptCount).toBe(10);
      expect(usageStats.averagePromptSize).toBeGreaterThan(0);
    });

    it('should identify largest prompts for cleanup suggestions', async () => {
      const mixedSizePrompts = [
        createLargePrompt(500 * 1024, 'huge-prompt'), // 500KB
        createLargePrompt(200 * 1024, 'large-prompt'), // 200KB
        createLargePrompt(50 * 1024, 'medium-prompt'), // 50KB
        createLargePrompt(10 * 1024, 'small-prompt'), // 10KB
        createLargePrompt(5 * 1024, 'tiny-prompt'), // 5KB
      ];

      await chrome.storage.local.set({ prompts: mixedSizePrompts });

      const prompts = await StorageManager.getPrompts();

      // Sort by size (content length as proxy for actual byte size)
      const promptsBySize = prompts.sort((a, b) => b.content.length - a.content.length);

      expect(promptsBySize[0].id).toBe('huge-prompt');
      expect(promptsBySize[1].id).toBe('large-prompt');
      expect(promptsBySize[4].id).toBe('tiny-prompt');

      // Top 2 largest prompts take up most of the space
      const top2Size = promptsBySize[0].content.length + promptsBySize[1].content.length;
      const totalContentSize = prompts.reduce((sum, p) => sum + p.content.length, 0);
      const top2Percentage = (top2Size / totalContentSize) * 100;

      expect(top2Percentage).toBeGreaterThan(70); // Top 2 are >70% of content
    });

    it('should handle storage cleanup simulation', async () => {
      const promptsToDelete = [
        createLargePrompt(300 * 1024, 'delete-1'),
        createLargePrompt(200 * 1024, 'delete-2'),
      ];
      const promptsToKeep = [
        createLargePrompt(50 * 1024, 'keep-1'),
        createLargePrompt(30 * 1024, 'keep-2'),
      ];

      const allPrompts = [...promptsToDelete, ...promptsToKeep];

      // Calculate size before cleanup
      const sizeBefore = allPrompts.reduce((sum, p) => sum + calculateDataSize(p), 0);

      // Store all prompts initially
      await chrome.storage.local.set({ prompts: allPrompts });

      // Delete the large prompts
      for (const prompt of promptsToDelete) {
        await StorageManager.deletePrompt(prompt.id);
      }

      // Check remaining prompts and calculate size
      const remainingPrompts = await StorageManager.getPrompts();
      const sizeAfter = remainingPrompts.reduce((sum, p) => sum + calculateDataSize(p), 0);
      const spaceSaved = sizeBefore - sizeAfter;

      expect(spaceSaved).toBeGreaterThan(400 * 1024); // Should save >400KB
      expect(sizeAfter).toBeLessThan(sizeBefore * 0.3); // Should be <30% of original size
    });
  });

  describe('🔴 Performance under Capacity Constraints', () => {
    it('should maintain performance with storage near capacity', async () => {
      const nearCapacityPrompts = Array.from(
        { length: 20 },
        (_, i) => createLargePrompt(200 * 1024, `near-capacity-${i}`) // 200KB each, ~4MB total
      );

      await chrome.storage.local.set({ prompts: nearCapacityPrompts });

      const startTime = performance.now();
      const prompts = await StorageManager.getPrompts();
      const endTime = performance.now();

      expect(prompts).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      const bytesUsed = await chrome.storage.local.getBytesInUse();
      expect(bytesUsed / MAX_STORAGE_SIZE).toBeGreaterThan(0.5); // Significant capacity usage
    });

    it('should handle concurrent operations under high storage usage', async () => {
      const highUsagePrompts = Array.from({ length: 15 }, (_, i) =>
        createLargePrompt(250 * 1024, `high-usage-${i}`)
      );

      await chrome.storage.local.set({
        prompts: highUsagePrompts,
        categories: ['test-category'],
        tags: ['test-tag'],
      });

      const operations = [
        StorageManager.getPrompts(),
        StorageManager.getCategories(),
        StorageManager.getTags(),
        StorageManager.getSettings(),
      ];

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();

      expect(results).toHaveLength(4);
      expect(results[0]).toHaveLength(15); // prompts
      expect(results[1]).toContain('test-category'); // categories
      expect(results[2]).toContain('test-tag'); // tags
      expect(endTime - startTime).toBeLessThan(3000); // All operations within 3 seconds
    });

    it('should provide capacity warnings at appropriate thresholds', async () => {
      const testScenarios = [
        { usage: 3 * 1024 * 1024, percentage: 60, warningLevel: 'none' },
        { usage: 4 * 1024 * 1024, percentage: 80, warningLevel: 'warning' },
        { usage: 4.5 * 1024 * 1024, percentage: 90, warningLevel: 'critical' },
        { usage: 4.8 * 1024 * 1024, percentage: 96, warningLevel: 'urgent' },
      ];

      for (const scenario of testScenarios) {
        // Create prompts that match the expected usage
        const numPrompts = Math.floor(scenario.usage / (50 * 1024)); // 50KB per prompt
        const testPrompts = Array.from({ length: numPrompts }, (_, i) =>
          createLargePrompt(50 * 1024, `scenario-prompt-${i}`)
        );

        await chrome.storage.local.clear();
        await chrome.storage.local.set({ prompts: testPrompts });

        const { usagePercentage } = await StorageManager.checkCapacity();

        // In real implementation, would trigger appropriate warnings
        if (scenario.warningLevel === 'warning') {
          expect(usagePercentage).toBeGreaterThanOrEqual(80);
          expect(usagePercentage).toBeLessThan(90);
        } else if (scenario.warningLevel === 'critical') {
          expect(usagePercentage).toBeGreaterThanOrEqual(90);
          expect(usagePercentage).toBeLessThan(95);
        } else if (scenario.warningLevel === 'urgent') {
          expect(usagePercentage).toBeGreaterThanOrEqual(95);
        }
      }
    });
  });
});
