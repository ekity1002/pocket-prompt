// ChatGPT Conversation Manager Test Suite
// TASK-0018: ChatGPT会話データ管理実装

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationManager } from '../../src/core/conversation-manager';
import type { ConversationExport, ConversationData, ExportFormat } from '../../src/types';

// Mock StorageManager
vi.mock('../../src/core/storage-manager', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  })),
}));

const createMockConversationExport = (overrides: Partial<ConversationExport> = {}): ConversationExport => ({
  id: 'export_12345_abcdef',
  site: 'chatgpt',
  title: 'Test AI Conversation',
  url: 'https://chat.openai.com/c/test-123',
  exportedAt: '2024-01-15T10:00:00.000Z',
  format: 'json',
  data: {
    title: 'Test AI Conversation',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: '2024-01-15T10:00:00.000Z',
        metadata: {
          messageId: 'msg-1',
          index: 0,
        },
      },
      {
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
        timestamp: '2024-01-15T10:01:00.000Z',
        metadata: {
          messageId: 'msg-2',
          parentId: 'msg-1',
          index: 1,
        },
      },
    ],
    metadata: {
      site: 'chatgpt',
      url: 'https://chat.openai.com/c/test-123',
      conversationId: 'test-123',
      totalMessages: 2,
      extractedAt: '2024-01-15T10:00:00.000Z',
    },
  },
  metadata: {
    messageCount: 2,
    exportVersion: '1.0.0',
    userAgent: 'Mozilla/5.0 Test Browser',
    extractionTime: 1000,
    parsingErrors: [],
    dataIntegrity: true,
  },
  ...overrides,
});

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  let mockStorageManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock storage manager
    mockStorageManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    
    conversationManager = new ConversationManager();
    // Override the storageManager with our mock
    conversationManager['storageManager'] = mockStorageManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Save Conversation', () => {
    it('should save a new conversation successfully', async () => {
      // 🟢 Green: Basic save functionality
      const exportData = createMockConversationExport();
      
      const result = await conversationManager.saveConversation(exportData, ['test'], false);

      expect(result.success).toBe(true);
      expect(result.id).toBe(exportData.id);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              id: exportData.id,
              title: exportData.title,
              site: exportData.site,
              tags: ['test'],
              isFavorite: false,
            }),
          ]),
          data: expect.objectContaining({
            [exportData.id]: exportData.data,
          }),
        })
      );
    });

    it('should detect duplicate conversations', async () => {
      // 🟡 Yellow: Duplicate detection
      const exportData = createMockConversationExport();
      
      // Mock existing storage with same conversation
      mockStorageManager.get.mockResolvedValue({
        records: [{
          id: 'existing-id',
          title: exportData.title,
          site: exportData.site,
          url: exportData.url,
          exportedAt: exportData.exportedAt,
          lastModified: '2024-01-15T10:00:00.000Z',
          messageCount: 2,
          format: 'json' as ExportFormat,
          size: 1000,
          tags: [],
          isFavorite: false,
          metadata: {
            extractionVersion: '1.0.0',
            dataIntegrity: true,
            parsingErrors: [],
          },
        }],
        data: {},
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 1000,
        version: '1.0.0',
      });

      const result = await conversationManager.saveConversation(exportData, [], false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.id).toBe('existing-id');
    });

    it('should handle storage capacity limits', async () => {
      // 🔴 Red: Storage limit handling
      const exportData = createMockConversationExport();
      
      // Mock storage near capacity
      mockStorageManager.get.mockResolvedValue({
        records: [],
        data: {},
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 4 * 1024 * 1024, // 4MB (near limit)
        version: '1.0.0',
      });

      const result = await conversationManager.saveConversation(exportData, [], false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage full');
    });

    it('should save conversation with tags and favorite status', async () => {
      // 🟡 Yellow: Metadata handling
      const exportData = createMockConversationExport();
      const tags = ['important', 'work', 'ai'];
      
      const result = await conversationManager.saveConversation(exportData, tags, true);

      expect(result.success).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              tags,
              isFavorite: true,
            }),
          ]),
        })
      );
    });
  });

  describe('Get Conversations', () => {
    beforeEach(() => {
      const mockStorage = {
        records: [
          {
            id: 'conv-1',
            title: 'AI Ethics Discussion',
            site: 'chatgpt' as const,
            url: 'https://chat.openai.com/c/conv-1',
            exportedAt: '2024-01-15T10:00:00.000Z',
            lastModified: '2024-01-15T10:00:00.000Z',
            messageCount: 5,
            format: 'json' as ExportFormat,
            size: 2000,
            tags: ['ethics', 'ai'],
            isFavorite: true,
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
          {
            id: 'conv-2',
            title: 'Programming Help',
            site: 'chatgpt' as const,
            url: 'https://chat.openai.com/c/conv-2',
            exportedAt: '2024-01-14T15:30:00.000Z',
            lastModified: '2024-01-14T15:30:00.000Z',
            messageCount: 3,
            format: 'markdown' as ExportFormat,
            size: 1500,
            tags: ['programming', 'help'],
            isFavorite: false,
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
        ],
        data: {},
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 3500,
        version: '1.0.0',
      };
      
      mockStorageManager.get.mockResolvedValue(mockStorage);
    });

    it('should retrieve all conversations', async () => {
      // 🟢 Green: Basic retrieval
      const result = await conversationManager.getConversations();

      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.records[0].title).toBe('AI Ethics Discussion');
    });

    it('should filter conversations by site', async () => {
      // 🟡 Yellow: Site filtering
      const result = await conversationManager.getConversations({
        site: 'chatgpt',
      });

      expect(result.records).toHaveLength(2);
      expect(result.records.every(r => r.site === 'chatgpt')).toBe(true);
    });

    it('should filter conversations by tags', async () => {
      // 🟡 Yellow: Tag filtering
      const result = await conversationManager.getConversations({
        tags: ['ethics'],
      });

      expect(result.records).toHaveLength(1);
      expect(result.records[0].title).toBe('AI Ethics Discussion');
    });

    it('should filter conversations by favorites', async () => {
      // 🟡 Yellow: Favorite filtering
      const result = await conversationManager.getConversations({
        isFavorite: true,
      });

      expect(result.records).toHaveLength(1);
      expect(result.records[0].isFavorite).toBe(true);
    });

    it('should filter conversations by search term', async () => {
      // 🟡 Yellow: Search functionality
      const result = await conversationManager.getConversations({
        searchTerm: 'programming',
      });

      expect(result.records).toHaveLength(1);
      expect(result.records[0].title).toBe('Programming Help');
    });

    it('should filter conversations by date range', async () => {
      // 🟡 Yellow: Date range filtering
      const result = await conversationManager.getConversations({
        dateRange: {
          from: '2024-01-15T00:00:00.000Z',
          to: '2024-01-15T23:59:59.000Z',
        },
      });

      expect(result.records).toHaveLength(1);
      expect(result.records[0].title).toBe('AI Ethics Discussion');
    });

    it('should sort conversations correctly', async () => {
      // 🟡 Yellow: Sorting functionality
      const result = await conversationManager.getConversations({
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(result.records[0].title).toBe('AI Ethics Discussion');
      expect(result.records[1].title).toBe('Programming Help');
    });

    it('should handle pagination', async () => {
      // 🟡 Yellow: Pagination
      const result = await conversationManager.getConversations({
        limit: 1,
        offset: 0,
      });

      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Update Conversation', () => {
    beforeEach(() => {
      mockStorageManager.get.mockResolvedValue({
        records: [{
          id: 'conv-1',
          title: 'Original Title',
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/conv-1',
          exportedAt: '2024-01-15T10:00:00.000Z',
          lastModified: '2024-01-15T10:00:00.000Z',
          messageCount: 2,
          format: 'json' as ExportFormat,
          size: 1000,
          tags: ['old-tag'],
          isFavorite: false,
          metadata: {
            extractionVersion: '1.0.0',
            dataIntegrity: true,
            parsingErrors: [],
          },
        }],
        data: { 'conv-1': {} },
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 1000,
        version: '1.0.0',
      });
    });

    it('should update conversation title', async () => {
      // 🟢 Green: Title update
      const result = await conversationManager.updateConversation('conv-1', {
        title: 'New Title',
      });

      expect(result.success).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              title: 'New Title',
              lastModified: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should update conversation tags', async () => {
      // 🟡 Yellow: Tag update
      const result = await conversationManager.updateConversation('conv-1', {
        tags: ['new-tag', 'another-tag'],
      });

      expect(result.success).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              tags: ['new-tag', 'another-tag'],
            }),
          ]),
        })
      );
    });

    it('should update favorite status', async () => {
      // 🟡 Yellow: Favorite status update
      const result = await conversationManager.updateConversation('conv-1', {
        isFavorite: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({
              isFavorite: true,
            }),
          ]),
        })
      );
    });

    it('should handle non-existent conversation', async () => {
      // 🔴 Red: Error handling
      const result = await conversationManager.updateConversation('non-existent', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Delete Conversation', () => {
    beforeEach(() => {
      mockStorageManager.get.mockResolvedValue({
        records: [{
          id: 'conv-1',
          title: 'Test Conversation',
          site: 'chatgpt',
          url: 'https://chat.openai.com/c/conv-1',
          exportedAt: '2024-01-15T10:00:00.000Z',
          lastModified: '2024-01-15T10:00:00.000Z',
          messageCount: 2,
          format: 'json' as ExportFormat,
          size: 1000,
          tags: [],
          isFavorite: false,
          metadata: {
            extractionVersion: '1.0.0',
            dataIntegrity: true,
            parsingErrors: [],
          },
        }],
        data: { 'conv-1': {} },
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 1000,
        version: '1.0.0',
      });
    });

    it('should delete conversation successfully', async () => {
      // 🟢 Green: Basic deletion
      const result = await conversationManager.deleteConversation('conv-1');

      expect(result.success).toBe(true);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: [],
          data: {},
          totalSize: 0,
        })
      );
    });

    it('should handle non-existent conversation deletion', async () => {
      // 🔴 Red: Error handling
      const result = await conversationManager.deleteConversation('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Storage Statistics', () => {
    it('should return correct storage statistics', async () => {
      // 🟢 Green: Statistics calculation
      mockStorageManager.get.mockResolvedValue({
        records: [
          { id: '1', site: 'chatgpt', size: 1000 },
          { id: '2', site: 'chatgpt', size: 500 },
          { id: '3', site: 'claude', size: 800 },
        ],
        data: {},
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 2300,
        version: '1.0.0',
      });

      const stats = await conversationManager.getStorageStats();

      expect(stats.totalConversations).toBe(3);
      expect(stats.totalSize).toBe(2300);
      expect(stats.availableSize).toBe(4 * 1024 * 1024 - 2300);
      expect(stats.usagePercentage).toBeCloseTo((2300 / (4 * 1024 * 1024)) * 100);
      expect(stats.siteDistribution.chatgpt).toBe(2);
      expect(stats.siteDistribution.claude).toBe(1);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      mockStorageManager.get.mockResolvedValue({
        records: [
          {
            id: 'conv-1',
            title: 'Conversation 1',
            site: 'chatgpt',
            url: 'https://chat.openai.com/c/conv-1',
            exportedAt: '2024-01-15T10:00:00.000Z',
            lastModified: '2024-01-15T10:00:00.000Z',
            messageCount: 2,
            format: 'json' as ExportFormat,
            size: 1000,
            tags: ['old-tag'],
            isFavorite: false,
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
          {
            id: 'conv-2',
            title: 'Conversation 2',
            site: 'chatgpt',
            url: 'https://chat.openai.com/c/conv-2',
            exportedAt: '2024-01-15T11:00:00.000Z',
            lastModified: '2024-01-15T11:00:00.000Z',
            messageCount: 3,
            format: 'json' as ExportFormat,
            size: 1500,
            tags: [],
            isFavorite: false,
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
        ],
        data: { 'conv-1': {}, 'conv-2': {} },
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 2500,
        version: '1.0.0',
      });
    });

    it('should perform bulk deletions', async () => {
      // 🟡 Yellow: Bulk deletion
      const result = await conversationManager.bulkOperations({
        delete: ['conv-1'],
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({ id: 'conv-2' }),
          ]),
          totalSize: 1500,
        })
      );
    });

    it('should perform bulk tag updates', async () => {
      // 🟡 Yellow: Bulk tag update
      const result = await conversationManager.bulkOperations({
        updateTags: [
          { id: 'conv-1', tags: ['new-tag-1', 'new-tag-2'] },
          { id: 'conv-2', tags: ['new-tag-3'] },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
    });

    it('should perform bulk favorite updates', async () => {
      // 🟡 Yellow: Bulk favorite update
      const result = await conversationManager.bulkOperations({
        setFavorite: [
          { id: 'conv-1', isFavorite: true },
          { id: 'conv-2', isFavorite: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
    });

    it('should handle mixed bulk operations', async () => {
      // 🟡 Yellow: Mixed operations
      const result = await conversationManager.bulkOperations({
        delete: ['conv-1'],
        updateTags: [{ id: 'conv-2', tags: ['updated'] }],
        setFavorite: [{ id: 'conv-2', isFavorite: true }],
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(3); // 1 delete + 2 updates
    });
  });

  describe('Storage Cleanup', () => {
    it('should perform automatic cleanup when storage is full', async () => {
      // 🔴 Red: Storage cleanup
      const exportData = createMockConversationExport();
      
      // Mock storage near capacity with old conversations
      mockStorageManager.get.mockResolvedValue({
        records: [
          {
            id: 'old-conv-1',
            title: 'Old Conversation 1',
            site: 'chatgpt',
            url: 'https://chat.openai.com/c/old-1',
            exportedAt: '2024-01-01T10:00:00.000Z',
            lastModified: '2024-01-01T10:00:00.000Z',
            messageCount: 2,
            format: 'json' as ExportFormat,
            size: 2000000, // 2MB
            tags: [],
            isFavorite: false, // Not favorite, can be cleaned
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
          {
            id: 'favorite-conv',
            title: 'Favorite Conversation',
            site: 'chatgpt',
            url: 'https://chat.openai.com/c/fav',
            exportedAt: '2024-01-02T10:00:00.000Z',
            lastModified: '2024-01-02T10:00:00.000Z',
            messageCount: 3,
            format: 'json' as ExportFormat,
            size: 2100000, // 2.1MB
            tags: [],
            isFavorite: true, // Favorite, should not be cleaned
            metadata: {
              extractionVersion: '1.0.0',
              dataIntegrity: true,
              parsingErrors: [],
            },
          },
        ],
        data: { 'old-conv-1': {}, 'favorite-conv': {} },
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 4100000, // Close to limit
        version: '1.0.0',
      });

      const result = await conversationManager.saveConversation(exportData, [], false);

      expect(result.success).toBe(true);
      // Check that the storage was saved with a reasonable total size
      expect(mockStorageManager.set).toHaveBeenCalledWith(
        'conversations',
        expect.objectContaining({
          totalSize: expect.any(Number),
        })
      );
    });
  });

  describe('Get All Tags', () => {
    it('should return all unique tags', async () => {
      // 🟡 Yellow: Tag aggregation
      mockStorageManager.get.mockResolvedValue({
        records: [
          { id: '1', tags: ['ai', 'ethics', 'philosophy'] },
          { id: '2', tags: ['programming', 'ai', 'help'] },
          { id: '3', tags: ['ethics', 'debate'] },
        ],
        data: {},
        lastSync: '2024-01-15T10:00:00.000Z',
        totalSize: 1000,
        version: '1.0.0',
      });

      const tags = await conversationManager.getAllTags();

      expect(tags).toHaveLength(6);
      expect(tags).toEqual(['ai', 'debate', 'ethics', 'help', 'philosophy', 'programming']);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // 🔴 Red: Storage error handling
      mockStorageManager.get.mockRejectedValue(new Error('Storage unavailable'));

      const result = await conversationManager.getConversations();

      expect(result.records).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      // 🔴 Red: Save error handling
      mockStorageManager.set.mockRejectedValue(new Error('Storage write failed'));
      const exportData = createMockConversationExport();

      const result = await conversationManager.saveConversation(exportData, [], false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save conversation');
    });
  });
});