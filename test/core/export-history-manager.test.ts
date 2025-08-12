// TASK-0019: Export History Manager Tests
// エクスポート履歴・管理機能のテストケース

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ExportHistoryManager } from '@/core/export-history-manager';
import { StorageManager } from '@/core/storage-manager';
import type { ConversationExport, ExportHistoryEntry, ExportStatistics } from '@/types';

// Mock StorageManager
vi.mock('@/core/storage-manager');
const mockStorageManager = vi.mocked(StorageManager);

describe('ExportHistoryManager', () => {
  let exportHistoryManager: ExportHistoryManager;
  let mockStorage: any;

  const mockExport: ConversationExport = {
    id: 'export_001',
    site: 'chatgpt',
    title: 'Test Conversation',
    url: 'https://chat.openai.com/c/123',
    exportedAt: '2024-02-12T10:00:00.000Z',
    format: 'markdown',
    data: {
      title: 'Test Conversation',
      messages: [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-02-12T09:55:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-02-12T09:55:05.000Z',
        },
      ],
    },
    metadata: {
      messageCount: 2,
      exportVersion: '1.0.0',
      userAgent: 'test-agent',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      getAllKeys: vi.fn(),
      getStorageInfo: vi.fn(),
    };
    mockStorageManager.mockReturnValue(mockStorage);
    exportHistoryManager = new ExportHistoryManager(mockStorage);
  });

  describe('履歴保存機能', () => {
    it('should save export to history', async () => {
      mockStorage.get.mockResolvedValue([]);

      await exportHistoryManager.saveToHistory(mockExport);

      expect(mockStorage.set).toHaveBeenCalledWith(
        'exportHistory',
        expect.arrayContaining([
          expect.objectContaining({
            exportId: mockExport.id,
            title: mockExport.title,
            site: mockExport.site,
            format: mockExport.format,
            exportedAt: mockExport.exportedAt,
            url: mockExport.url,
            fileSize: expect.any(Number),
            messageCount: mockExport.metadata.messageCount,
          }),
        ])
      );
    });

    it('should calculate correct file size for export', async () => {
      mockStorage.get.mockResolvedValue([]);

      await exportHistoryManager.saveToHistory(mockExport);

      const savedHistory = mockStorage.set.mock.calls[0][1] as ExportHistoryEntry[];
      expect(savedHistory[0].fileSize).toBeGreaterThan(0);
    });

    it('should maintain chronological order in history', async () => {
      const existingExport: ExportHistoryEntry = {
        exportId: 'export_000',
        title: 'Older Export',
        site: 'chatgpt',
        format: 'json',
        exportedAt: '2024-02-11T10:00:00.000Z',
        url: 'https://chat.openai.com/c/000',
        fileSize: 1000,
        messageCount: 1,
      };

      mockStorage.get.mockResolvedValue([existingExport]);

      await exportHistoryManager.saveToHistory(mockExport);

      const savedHistory = mockStorage.set.mock.calls[0][1] as ExportHistoryEntry[];
      expect(savedHistory).toHaveLength(2);
      expect(savedHistory[0].exportId).toBe(mockExport.id); // Most recent first
      expect(savedHistory[1].exportId).toBe('export_000'); // Older second
    });
  });

  describe('履歴取得機能', () => {
    it('should return export history in chronological order', async () => {
      const mockHistory: ExportHistoryEntry[] = [
        {
          exportId: 'export_002',
          title: 'Recent Export',
          site: 'claude',
          format: 'markdown',
          exportedAt: '2024-02-12T11:00:00.000Z',
          url: 'https://claude.ai/chat/abc',
          fileSize: 2000,
          messageCount: 3,
        },
        {
          exportId: 'export_001',
          title: 'Older Export',
          site: 'chatgpt',
          format: 'json',
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/123',
          fileSize: 1500,
          messageCount: 2,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      const result = await exportHistoryManager.getHistory();

      expect(result).toEqual(mockHistory);
      expect(result[0].exportedAt > result[1].exportedAt).toBe(true);
    });

    it('should return empty array when no history exists', async () => {
      mockStorage.get.mockResolvedValue(null);

      const result = await exportHistoryManager.getHistory();

      expect(result).toEqual([]);
    });

    it('should limit history results when limit is specified', async () => {
      const mockHistory = Array.from({ length: 50 }, (_, i) => ({
        exportId: `export_${i}`,
        title: `Export ${i}`,
        site: 'chatgpt' as const,
        format: 'markdown' as const,
        exportedAt: new Date(2024, 1, 12, 10, i).toISOString(),
        url: `https://chat.openai.com/c/${i}`,
        fileSize: 1000 + i,
        messageCount: i + 1,
      }));

      mockStorage.get.mockResolvedValue(mockHistory);

      const result = await exportHistoryManager.getHistory(10);

      expect(result).toHaveLength(10);
      expect(result).toEqual(mockHistory.slice(0, 10));
    });
  });

  describe('重複エクスポート検知', () => {
    it('should detect duplicate export by URL and timestamp', async () => {
      const existingExport: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Existing Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/123',
        fileSize: 1000,
        messageCount: 2,
      };

      mockStorage.get.mockResolvedValue([existingExport]);

      const isDuplicate = await exportHistoryManager.checkDuplicate(
        'https://chat.openai.com/c/123',
        'chatgpt',
        'Test Conversation'
      );

      expect(isDuplicate).toBe(true);
    });

    it('should not detect duplicate for different URL', async () => {
      const existingExport: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Existing Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/123',
        fileSize: 1000,
        messageCount: 2,
      };

      mockStorage.get.mockResolvedValue([existingExport]);

      const isDuplicate = await exportHistoryManager.checkDuplicate(
        'https://chat.openai.com/c/456', // Different URL
        'chatgpt',
        'Different Conversation'
      );

      expect(isDuplicate).toBe(false);
    });

    it('should consider exports from different sites as non-duplicates', async () => {
      const existingExport: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'ChatGPT Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/123',
        fileSize: 1000,
        messageCount: 2,
      };

      mockStorage.get.mockResolvedValue([existingExport]);

      const isDuplicate = await exportHistoryManager.checkDuplicate(
        'https://claude.ai/chat/abc',
        'claude', // Different site
        'Claude Conversation'
      );

      expect(isDuplicate).toBe(false);
    });
  });

  describe('エクスポート統計情報', () => {
    it('should calculate correct statistics', async () => {
      const mockHistory: ExportHistoryEntry[] = [
        {
          exportId: 'export_001',
          title: 'Export 1',
          site: 'chatgpt',
          format: 'markdown',
          exportedAt: '2024-02-12T10:00:00.000Z',
          url: 'https://chat.openai.com/c/1',
          fileSize: 1000,
          messageCount: 5,
        },
        {
          exportId: 'export_002',
          title: 'Export 2',
          site: 'claude',
          format: 'json',
          exportedAt: '2024-02-12T11:00:00.000Z',
          url: 'https://claude.ai/chat/2',
          fileSize: 2000,
          messageCount: 10,
        },
        {
          exportId: 'export_003',
          title: 'Export 3',
          site: 'chatgpt',
          format: 'markdown',
          exportedAt: '2024-02-12T12:00:00.000Z',
          url: 'https://chat.openai.com/c/3',
          fileSize: 1500,
          messageCount: 7,
        },
      ];

      mockStorage.get.mockResolvedValue(mockHistory);

      const stats = await exportHistoryManager.getStatistics();

      const expected: ExportStatistics = {
        totalExports: 3,
        totalFileSize: 4500,
        averageFileSize: 1500,
        totalMessages: 22,
        averageMessages: 7.33,
        siteBreakdown: {
          chatgpt: 2,
          claude: 1,
          gemini: 0,
        },
        formatBreakdown: {
          markdown: 2,
          json: 1,
          txt: 0,
          csv: 0,
        },
        oldestExport: '2024-02-12T10:00:00.000Z',
        newestExport: '2024-02-12T12:00:00.000Z',
      };

      expect(stats).toEqual(expected);
    });

    it('should return empty statistics when no history exists', async () => {
      mockStorage.get.mockResolvedValue([]);

      const stats = await exportHistoryManager.getStatistics();

      expect(stats).toEqual({
        totalExports: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        totalMessages: 0,
        averageMessages: 0,
        siteBreakdown: {
          chatgpt: 0,
          claude: 0,
          gemini: 0,
        },
        formatBreakdown: {
          markdown: 0,
          json: 0,
          txt: 0,
          csv: 0,
        },
        oldestExport: null,
        newestExport: null,
      });
    });
  });

  describe('古い履歴の自動削除', () => {
    it('should delete history older than retention period', async () => {
      const now = new Date('2024-02-12T10:00:00.000Z');
      vi.setSystemTime(now);

      const oldExport: ExportHistoryEntry = {
        exportId: 'export_old',
        title: 'Old Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-01-01T10:00:00.000Z', // 42 days ago
        url: 'https://chat.openai.com/c/old',
        fileSize: 1000,
        messageCount: 5,
      };

      const recentExport: ExportHistoryEntry = {
        exportId: 'export_recent',
        title: 'Recent Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-10T10:00:00.000Z', // 2 days ago
        url: 'https://chat.openai.com/c/recent',
        fileSize: 1500,
        messageCount: 8,
      };

      mockStorage.get.mockResolvedValue([recentExport, oldExport]);

      await exportHistoryManager.cleanupOldHistory(30); // 30 days retention

      expect(mockStorage.set).toHaveBeenCalledWith('exportHistory', [recentExport]);

      vi.useRealTimers();
    });

    it('should not delete anything if all exports are within retention period', async () => {
      const now = new Date('2024-02-12T10:00:00.000Z');
      vi.setSystemTime(now);

      const recentExport: ExportHistoryEntry = {
        exportId: 'export_recent',
        title: 'Recent Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-10T10:00:00.000Z', // 2 days ago
        url: 'https://chat.openai.com/c/recent',
        fileSize: 1500,
        messageCount: 8,
      };

      mockStorage.get.mockResolvedValue([recentExport]);

      await exportHistoryManager.cleanupOldHistory(30); // 30 days retention

      expect(mockStorage.set).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('履歴からの再ダウンロード', () => {
    it('should retrieve export data for re-download', async () => {
      const historyEntry: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Test Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/123',
        fileSize: 1000,
        messageCount: 5,
      };

      mockStorage.get.mockResolvedValueOnce([historyEntry]); // For getHistory call
      mockStorage.get.mockResolvedValueOnce(mockExport); // For getExportData call

      const exportData = await exportHistoryManager.getExportForRedownload('export_001');

      expect(exportData).toEqual(mockExport);
      expect(mockStorage.get).toHaveBeenCalledWith('exportData_export_001');
    });

    it('should throw error if export not found in history', async () => {
      mockStorage.get.mockResolvedValue([]);

      await expect(exportHistoryManager.getExportForRedownload('nonexistent')).rejects.toThrow(
        'Export not found in history'
      );
    });

    it('should throw error if export data is missing', async () => {
      const historyEntry: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Test Export',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/123',
        fileSize: 1000,
        messageCount: 5,
      };

      mockStorage.get.mockResolvedValueOnce([historyEntry]); // For getHistory call
      mockStorage.get.mockResolvedValueOnce(null); // Export data missing

      await expect(exportHistoryManager.getExportForRedownload('export_001')).rejects.toThrow(
        'Export data not found'
      );
    });
  });

  describe('履歴エントリ削除', () => {
    it('should remove specific export from history', async () => {
      const export1: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Export 1',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/1',
        fileSize: 1000,
        messageCount: 5,
      };

      const export2: ExportHistoryEntry = {
        exportId: 'export_002',
        title: 'Export 2',
        site: 'claude',
        format: 'json',
        exportedAt: '2024-02-12T11:00:00.000Z',
        url: 'https://claude.ai/chat/2',
        fileSize: 2000,
        messageCount: 10,
      };

      mockStorage.get.mockResolvedValue([export1, export2]);

      await exportHistoryManager.removeFromHistory('export_001');

      expect(mockStorage.set).toHaveBeenCalledWith('exportHistory', [export2]);
      expect(mockStorage.remove).toHaveBeenCalledWith('exportData_export_001');
    });

    it('should handle removal of non-existent export gracefully', async () => {
      const export1: ExportHistoryEntry = {
        exportId: 'export_001',
        title: 'Export 1',
        site: 'chatgpt',
        format: 'markdown',
        exportedAt: '2024-02-12T10:00:00.000Z',
        url: 'https://chat.openai.com/c/1',
        fileSize: 1000,
        messageCount: 5,
      };

      mockStorage.get.mockResolvedValue([export1]);

      await exportHistoryManager.removeFromHistory('nonexistent');

      expect(mockStorage.set).toHaveBeenCalledWith('exportHistory', [export1]);
      expect(mockStorage.remove).toHaveBeenCalledWith('exportData_nonexistent');
    });
  });
});