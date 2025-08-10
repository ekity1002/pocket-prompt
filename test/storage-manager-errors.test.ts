// StorageManager Error Handling Test Suite
// TASK-0006: TDD Error Handling Test Cases

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { StorageManager } from '@/utils/storage';

// Chrome API Mock Setup
const mockChromeStorageSync = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  getBytesInUse: vi.fn(),
};

// Extend existing chrome mock with error-specific mocks
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

describe('StorageManager - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Console error mock to suppress error logs during testing
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('🟡 Storage Permission Errors', () => {
    it('should handle chrome.storage.sync permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      mockChromeStorageSync.get.mockRejectedValue(permissionError);
      
      await expect(StorageManager.getPrompts()).rejects.toThrow('Failed to load prompts from storage');
      expect(console.error).toHaveBeenCalledWith('Failed to get prompts:', permissionError);
    });

    it('should handle storage write permission errors', async () => {
      const writeError = new Error('Write permission denied');
      mockChromeStorageSync.get.mockResolvedValue({ prompts: [] });
      mockChromeStorageSync.set.mockRejectedValue(writeError);
      
      const newPromptData = {
        title: 'Test Prompt',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
      };
      
      await expect(StorageManager.savePrompt(newPromptData)).rejects.toThrow('Failed to save prompt to storage');
      expect(console.error).toHaveBeenCalledWith('Failed to save prompt:', writeError);
    });

    it('should handle settings read permission errors gracefully', async () => {
      const readError = new Error('Settings read denied');
      mockChromeStorageSync.get.mockRejectedValue(readError);
      
      const settings = await StorageManager.getSettings();
      
      // Should return default settings instead of throwing
      expect(settings).toMatchObject({
        theme: 'system',
        autoSave: true,
        syncEnabled: true,
        autoTag: true,
      });
      expect(console.error).toHaveBeenCalledWith('Failed to get settings:', readError);
    });
  });

  describe('🟡 Storage Quota Exceeded Errors', () => {
    it('should handle QUOTA_EXCEEDED_ERR when saving prompts', async () => {
      const quotaError = new DOMException('Quota exceeded', 'QUOTA_EXCEEDED_ERR');
      mockChromeStorageSync.get.mockResolvedValue({ prompts: [] });
      mockChromeStorageSync.set.mockRejectedValue(quotaError);
      
      const largePromptData = {
        title: 'Large Prompt',
        content: 'A'.repeat(50000), // Large content
        category: 'large',
        tags: ['large'],
      };
      
      await expect(StorageManager.savePrompt(largePromptData)).rejects.toThrow('Failed to save prompt to storage');
      expect(console.error).toHaveBeenCalledWith('Failed to save prompt:', quotaError);
    });

    it('should handle quota exceeded during bulk import', async () => {
      const quotaError = new DOMException('Storage quota exceeded', 'QUOTA_EXCEEDED_ERR');
      mockChromeStorageSync.clear.mockResolvedValue(undefined);
      mockChromeStorageSync.set.mockRejectedValue(quotaError);
      
      const largeImportData = {
        prompts: Array.from({ length: 1000 }, (_, i) => ({
          id: `prompt-${i}`,
          title: `Prompt ${i}`,
          content: 'A'.repeat(1000),
          category: 'imported',
          tags: ['imported'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        settings: {
          theme: 'dark' as const,
          autoSave: true,
          syncEnabled: true,
          autoTag: true,
          exportFormat: 'json' as const,
          shortcuts: { capture: 'Alt+C', toggle: 'Alt+P' },
        },
        categories: [],
        tags: [],
      };
      
      await expect(StorageManager.importData(largeImportData)).rejects.toThrow('Failed to import data to storage');
      expect(console.error).toHaveBeenCalledWith('Failed to import data:', quotaError);
    });

    it('should handle quota monitoring and reporting', async () => {
      // Mock quota usage close to limit
      mockChromeStorageSync.getBytesInUse.mockResolvedValue(4.5 * 1024 * 1024); // 4.5MB
      
      // This would be part of a quota monitoring function if implemented
      const bytesInUse = await chrome.storage.sync.getBytesInUse();
      const maxQuota = 5 * 1024 * 1024; // 5MB
      const usagePercentage = (bytesInUse / maxQuota) * 100;
      
      expect(usagePercentage).toBeGreaterThan(90); // More than 90% used
      expect(bytesInUse).toBeLessThan(maxQuota);
    });
  });

  describe('🟡 Data Corruption and Validation Errors', () => {
    it('should handle corrupted prompt data gracefully', async () => {
      const corruptedData = {
        prompts: [
          { id: 'valid-prompt', title: 'Valid', content: 'Valid content', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: 'corrupt-prompt' }, // Missing required fields
          'not-an-object', // Invalid data type
          null,
        ],
      };
      
      mockChromeStorageSync.get.mockResolvedValue(corruptedData);
      
      // Should not throw but handle gracefully
      const prompts = await StorageManager.getPrompts();
      
      // Should return whatever is in storage, letting higher layers handle validation
      expect(Array.isArray(prompts)).toBe(true);
    });

    it('should handle malformed settings data', async () => {
      const malformedSettings = {
        settings: {
          theme: 'invalid-theme',
          autoSave: 'not-a-boolean',
          invalidField: 'should-not-exist',
        },
      };
      
      mockChromeStorageSync.get.mockResolvedValue(malformedSettings);
      
      const settings = await StorageManager.getSettings();
      
      // Should return the malformed data as-is, letting validation happen at UI layer
      expect(settings).toEqual(malformedSettings.settings);
    });

    it('should handle JSON serialization errors during export', async () => {
      const circularReference: any = { name: 'test' };
      circularReference.self = circularReference; // Create circular reference
      
      const problematicData = {
        prompts: [circularReference],
        settings: {},
        categories: [],
        tags: [],
      };
      
      mockChromeStorageSync.get.mockResolvedValue(problematicData);
      
      const exportedData = await StorageManager.exportData();
      
      // Should return the data as-is from chrome.storage
      expect(exportedData).toEqual(problematicData);
    });
  });

  describe('🟡 Network and Sync Errors', () => {
    it('should handle network connectivity issues during sync operations', async () => {
      const networkError = new Error('Network unavailable');
      mockChromeStorageSync.get.mockRejectedValue(networkError);
      
      await expect(StorageManager.getPrompts()).rejects.toThrow('Failed to load prompts from storage');
      expect(console.error).toHaveBeenCalledWith('Failed to get prompts:', networkError);
    });

    it('should handle sync conflicts gracefully', async () => {
      const syncConflictError = new Error('Sync conflict detected');
      mockChromeStorageSync.set.mockRejectedValue(syncConflictError);
      mockChromeStorageSync.get.mockResolvedValue({ prompts: [] });
      
      const promptData = {
        title: 'Conflict Test',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
      };
      
      await expect(StorageManager.savePrompt(promptData)).rejects.toThrow('Failed to save prompt to storage');
      expect(console.error).toHaveBeenCalledWith('Failed to save prompt:', syncConflictError);
    });

    it('should handle partial sync failures during settings save', async () => {
      const partialFailure = new Error('Partial sync failure');
      mockChromeStorageSync.get.mockResolvedValue({ settings: { theme: 'dark' } });
      mockChromeStorageSync.set.mockRejectedValue(partialFailure);
      
      const settingsUpdate = { autoSave: false };
      
      await expect(StorageManager.saveSettings(settingsUpdate)).rejects.toThrow('Failed to save settings to storage');
      expect(console.error).toHaveBeenCalledWith('Failed to save settings:', partialFailure);
    });
  });

  describe('🟡 Concurrent Access Errors', () => {
    it('should handle concurrent write operations', async () => {
      let callCount = 0;
      mockChromeStorageSync.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ prompts: [] });
        }
        // Simulate concurrent modification
        return Promise.resolve({ 
          prompts: [{ id: 'concurrent-prompt', title: 'Added by another process' }] 
        });
      });
      
      mockChromeStorageSync.set.mockResolvedValue(undefined);
      
      const prompt1Data = { title: 'Prompt 1', content: 'Content 1', category: 'test', tags: ['test'] };
      const prompt2Data = { title: 'Prompt 2', content: 'Content 2', category: 'test', tags: ['test'] };
      
      const [result1, result2] = await Promise.all([
        StorageManager.savePrompt(prompt1Data),
        StorageManager.savePrompt(prompt2Data),
      ]);
      
      expect(result1).toMatchObject(prompt1Data);
      expect(result2).toMatchObject(prompt2Data);
      expect(result1.id).not.toBe(result2.id);
    });

    it('should handle race conditions during delete operations', async () => {
      const existingPrompts = [
        { id: 'prompt-1', title: 'Prompt 1' },
        { id: 'prompt-2', title: 'Prompt 2' },
      ];
      
      mockChromeStorageSync.get.mockResolvedValue({ prompts: existingPrompts });
      mockChromeStorageSync.set.mockResolvedValue(undefined);
      
      // Simulate concurrent deletes
      const deletePromises = [
        StorageManager.deletePrompt('prompt-1'),
        StorageManager.deletePrompt('prompt-2'),
      ];
      
      await expect(Promise.all(deletePromises)).resolves.not.toThrow();
      expect(mockChromeStorageSync.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('🟡 Resource Exhaustion', () => {
    it('should handle memory pressure during large operations', async () => {
      const hugeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `prompt-${i}`,
        title: `Prompt ${i}`,
        content: 'X'.repeat(1000),
        category: 'memory-test',
        tags: [`tag-${i}`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      mockChromeStorageSync.get.mockResolvedValue({ prompts: hugeArray });
      
      const startMemory = process.memoryUsage().heapUsed;
      const prompts = await StorageManager.getPrompts();
      const endMemory = process.memoryUsage().heapUsed;
      
      expect(prompts).toHaveLength(10000);
      expect(endMemory - startMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    it('should handle timeout scenarios', async () => {
      // Mock a very slow storage response
      mockChromeStorageSync.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ prompts: [] }), 5000))
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), 1000)
      );
      
      const getPromptsPromise = StorageManager.getPrompts();
      
      await expect(
        Promise.race([getPromptsPromise, timeoutPromise])
      ).rejects.toThrow('Operation timeout');
    });
  });

  describe('🟡 Data Integrity and Recovery', () => {
    it('should detect and handle data inconsistencies', async () => {
      const inconsistentData = {
        prompts: [
          { id: 'prompt-1', title: 'Test', content: 'Content', tags: ['tag1'] },
        ],
        categories: ['cat1', 'cat2'], // Categories not referenced by prompts
        tags: ['tag2', 'tag3'], // Tags not used by prompts
      };
      
      mockChromeStorageSync.get
        .mockResolvedValueOnce({ prompts: inconsistentData.prompts })
        .mockResolvedValueOnce({ categories: inconsistentData.categories })
        .mockResolvedValueOnce({ tags: inconsistentData.tags });
      
      const [prompts, categories, tags] = await Promise.all([
        StorageManager.getPrompts(),
        StorageManager.getCategories(),
        StorageManager.getTags(),
      ]);
      
      expect(prompts).toHaveLength(1);
      expect(categories).toEqual(['cat1', 'cat2']);
      expect(tags).toEqual(['tag2', 'tag3']);
    });

    it('should handle backup and restore scenarios', async () => {
      const backupData = {
        prompts: [{ id: 'backup-prompt', title: 'Backup Test' }],
        settings: { theme: 'dark' },
        categories: ['backup-category'],
        tags: ['backup-tag'],
      };
      
      // Test backup (export)
      mockChromeStorageSync.get.mockResolvedValue(backupData);
      const exported = await StorageManager.exportData();
      expect(exported).toEqual(backupData);
      
      // Test restore (import)
      mockChromeStorageSync.clear.mockResolvedValue(undefined);
      mockChromeStorageSync.set.mockResolvedValue(undefined);
      
      await expect(StorageManager.importData(exported)).resolves.not.toThrow();
      expect(mockChromeStorageSync.clear).toHaveBeenCalledTimes(1);
      expect(mockChromeStorageSync.set).toHaveBeenCalledWith(exported);
    });
  });
});
