// TASK-0019: Export Manager Integration Tests
// ExportManager と ExportHistoryManager の統合テスト

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ExportManager } from '@/core/export-manager';
import { StorageManager } from '@/core/storage-manager';
import type { SupportedAISite, ExportOptions } from '@/types';

// Mock StorageManager
vi.mock('@/core/storage-manager');
const mockStorageManager = vi.mocked(StorageManager);

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://chat.openai.com/c/test-conversation-123',
  },
  writable: true,
});

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true,
});

describe('ExportManager Integration with History Management', () => {
  let exportManager: ExportManager;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      getAllKeys: vi.fn(),
      getStorageInfo: vi.fn(),
      saveExport: vi.fn(),
    };
    mockStorageManager.mockReturnValue(mockStorage);
    exportManager = new ExportManager(mockStorage);
  });

  describe('履歴管理統合機能', () => {
    it('should save export to history when saveToStorage is true', async () => {
      mockStorage.get.mockResolvedValue([]); // Empty history

      const options: ExportOptions = {
        format: 'markdown',
        saveToStorage: true,
      };

      const result = await exportManager.exportConversation('chatgpt', options);

      // Verify export was saved to storage
      expect(mockStorage.saveExport).toHaveBeenCalledWith(result);

      // Verify export was saved to history
      expect(mockStorage.set).toHaveBeenCalledWith(
        'exportHistory',
        expect.arrayContaining([
          expect.objectContaining({
            exportId: result.id,
            title: result.title,
            site: 'chatgpt',
            format: 'markdown',
            url: 'https://chat.openai.com/c/test-conversation-123',
          }),
        ])
      );
    });

    it('should detect and warn about duplicate exports', async () => {
      // Mock existing export in history
      const existingHistory = [
        {
          exportId: 'existing_export',
          title: 'ChatGPT Conversation',
          site: 'chatgpt',
          format: 'markdown',
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/test-conversation-123',
          fileSize: 1000,
          messageCount: 2,
        },
      ];

      mockStorage.get.mockResolvedValue(existingHistory);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const options: ExportOptions = {
        format: 'json',
        saveToStorage: true,
      };

      await exportManager.exportConversation('chatgpt', options);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Duplicate export detected:',
        expect.objectContaining({
          url: 'https://chat.openai.com/c/test-conversation-123',
          site: 'chatgpt',
          title: 'ChatGPT Conversation',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should allow forced duplicate exports', async () => {
      // Mock existing export in history
      const existingHistory = [
        {
          exportId: 'existing_export',
          title: 'ChatGPT Conversation',
          site: 'chatgpt',
          format: 'markdown',
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/test-conversation-123',
          fileSize: 1000,
          messageCount: 2,
        },
      ];

      mockStorage.get.mockResolvedValue(existingHistory);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const options: ExportOptions = {
        format: 'json',
        saveToStorage: true,
        forceDuplicate: true,
      };

      const result = await exportManager.exportConversation('chatgpt', options);

      // Should not warn when forceDuplicate is true
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Duplicate export detected:',
        expect.any(Object)
      );

      // Should still save to storage and history
      expect(mockStorage.saveExport).toHaveBeenCalledWith(result);
      expect(mockStorage.set).toHaveBeenCalledWith(
        'exportHistory',
        expect.arrayContaining([
          expect.objectContaining({
            exportId: result.id,
          }),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should use custom URL when provided', async () => {
      mockStorage.get.mockResolvedValue([]);

      const customUrl = 'https://claude.ai/chat/custom-conversation';
      const options: ExportOptions = {
        format: 'markdown',
        saveToStorage: true,
        url: customUrl,
      };

      const result = await exportManager.exportConversation('claude', options);

      expect(result.url).toBe(customUrl);

      expect(mockStorage.set).toHaveBeenCalledWith(
        'exportHistory',
        expect.arrayContaining([
          expect.objectContaining({
            url: customUrl,
          }),
        ])
      );
    });
  });

  describe('履歴管理API統合', () => {
    it('should get export history through manager', async () => {
      const mockHistory = [
        {
          exportId: 'export_001',
          title: 'Test Export',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/123',
          fileSize: 1000,
          messageCount: 5,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      const result = await exportManager.getExportHistory(10);

      expect(result).toEqual(mockHistory);
      expect(mockStorage.get).toHaveBeenCalledWith('exportHistory');
    });

    it('should get export statistics through manager', async () => {
      const mockHistory = [
        {
          exportId: 'export_001',
          title: 'Export 1',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/1',
          fileSize: 1000,
          messageCount: 5,
        },
        {
          exportId: 'export_002',
          title: 'Export 2',
          site: 'claude' as SupportedAISite,
          format: 'json' as const,
          exportedAt: '2024-02-12T11:00:00.000Z',
          url: 'https://claude.ai/chat/2',
          fileSize: 2000,
          messageCount: 10,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      const stats = await exportManager.getExportStatistics();

      expect(stats).toEqual({
        totalExports: 2,
        totalFileSize: 3000,
        averageFileSize: 1500,
        totalMessages: 15,
        averageMessages: 7.5,
        siteBreakdown: {
          chatgpt: 1,
          claude: 1,
          gemini: 0,
        },
        formatBreakdown: {
          markdown: 1,
          json: 1,
          txt: 0,
          csv: 0,
        },
        oldestExport: '2024-02-12T10:00:00.000Z',
        newestExport: '2024-02-12T11:00:00.000Z',
      });
    });

    it('should check duplicate through manager', async () => {
      const mockHistory = [
        {
          exportId: 'existing',
          title: 'Existing Export',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/existing',
          fileSize: 1000,
          messageCount: 5,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      const isDuplicate = await exportManager.checkDuplicateExport(
        'https://chat.openai.com/c/existing',
        'chatgpt',
        'Existing Export'
      );

      expect(isDuplicate).toBe(true);
    });

    it('should remove export from history through manager', async () => {
      const mockHistory = [
        {
          exportId: 'export_to_remove',
          title: 'Export to Remove',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/remove',
          fileSize: 1000,
          messageCount: 5,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      await exportManager.removeExportFromHistory('export_to_remove');

      expect(mockStorage.set).toHaveBeenCalledWith('exportHistory', []);
      expect(mockStorage.remove).toHaveBeenCalledWith('exportData_export_to_remove');
    });

    it('should get export for redownload through manager', async () => {
      const mockHistory = [
        {
          exportId: 'redownload_export',
          title: 'Redownload Export',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/redownload',
          fileSize: 1000,
          messageCount: 5,
        },
      ];

      const mockExportData = {
        id: 'redownload_export',
        site: 'chatgpt' as SupportedAISite,
        title: 'Redownload Export',
        url: 'https://chat.openai.com/c/redownload',
        exportedAt: '2024-02-12T10:00:00.000Z',
        format: 'markdown' as const,
        data: {
          title: 'Redownload Export',
          messages: [
            { role: 'user' as const, content: 'Hello', timestamp: '2024-02-12T09:55:00.000Z' },
            { role: 'assistant' as const, content: 'Hi!', timestamp: '2024-02-12T09:55:05.000Z' },
          ],
        },
        metadata: {
          messageCount: 2,
          exportVersion: '1.0.0',
          userAgent: 'test-agent',
        },
      };

      mockStorage.get
        .mockResolvedValueOnce(mockHistory) // For history check
        .mockResolvedValueOnce(mockExportData); // For export data

      const result = await exportManager.getExportForRedownload('redownload_export');

      expect(result).toEqual(mockExportData);
      expect(mockStorage.get).toHaveBeenCalledWith('exportData_redownload_export');
    });

    it('should cleanup old exports through manager', async () => {
      const now = new Date('2024-02-12T10:00:00.000Z');
      vi.setSystemTime(now);

      const mockHistory = [
        {
          exportId: 'old_export',
          title: 'Old Export',
          site: 'chatgpt' as SupportedAISite,
          format: 'markdown' as const,
          exportedAt: '2024-01-01T10:00:00.000Z', // 42 days old
          url: 'https://chat.openai.com/c/old',
          fileSize: 1000,
          messageCount: 5,
        },
        {
          exportId: 'recent_export',
          title: 'Recent Export',
          site: 'claude' as SupportedAISite,
          format: 'json' as const,
          exportedAt: '2024-02-10T10:00:00.000Z', // 2 days old
          url: 'https://claude.ai/chat/recent',
          fileSize: 2000,
          messageCount: 10,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      await exportManager.cleanupOldExports(30); // 30 days retention

      expect(mockStorage.set).toHaveBeenCalledWith(
        'exportHistory',
        expect.arrayContaining([
          expect.objectContaining({ exportId: 'recent_export' }),
        ])
      );

      expect(mockStorage.remove).toHaveBeenCalledWith('exportData_old_export');

      vi.useRealTimers();
    });
  });
});