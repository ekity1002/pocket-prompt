// ChatGPT Conversation Data Management System
// TASK-0018: ChatGPT会話データ管理実装

import type { ConversationExport, ConversationData, ExportFormat, SupportedAISite } from '@/types';
import { StorageManager } from './storage-manager';
import { generateRequestId } from '@/types';

export interface ConversationRecord {
  id: string;
  title: string;
  site: SupportedAISite;
  url: string;
  exportedAt: string;
  lastModified: string;
  messageCount: number;
  format: ExportFormat;
  size: number; // データサイズ (bytes)
  tags: string[];
  isFavorite: boolean;
  metadata: {
    extractionVersion: string;
    dataIntegrity: boolean;
    parsingErrors: string[];
    model?: string;
    language?: string;
  };
}

export interface ConversationStorage {
  records: ConversationRecord[];
  data: Record<string, ConversationData>;
  lastSync: string;
  totalSize: number;
  version: string;
}

export interface ConversationQuery {
  site?: SupportedAISite;
  dateRange?: {
    from: string;
    to: string;
  };
  tags?: string[];
  searchTerm?: string;
  isFavorite?: boolean;
  sortBy?: 'exportedAt' | 'lastModified' | 'title' | 'messageCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ConversationSyncResult {
  success: boolean;
  recordsProcessed: number;
  duplicatesSkipped: number;
  errors: string[];
  storageUsed: number;
  storageAvailable: number;
}

/**
 * ChatGPT Conversation Data Management System
 * Handles storage, retrieval, and organization of exported conversations
 */
export class ConversationManager {
  private storageManager: StorageManager;
  private readonly STORAGE_KEY = 'conversations';
  private readonly MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (reserve 1MB)
  private readonly CLEANUP_THRESHOLD = 0.85; // Start cleanup at 85% usage

  constructor() {
    this.storageManager = new StorageManager();
  }

  /**
   * Save conversation export to storage
   */
  public async saveConversation(
    exportData: ConversationExport,
    tags: string[] = [],
    isFavorite: boolean = false
  ): Promise<{ success: boolean; id: string; error?: string }> {
    try {
      const storage = await this.getConversationStorage();

      // Check for duplicates
      const existingRecord = this.findDuplicateConversation(storage, exportData);
      if (existingRecord) {
        return {
          success: false,
          id: existingRecord.id,
          error: `Conversation already exists: ${existingRecord.title}`,
        };
      }

      // Calculate data size
      const dataSize = this.calculateDataSize(exportData.data);

      // Check storage capacity
      if (storage.totalSize + dataSize > this.MAX_STORAGE_SIZE) {
        const cleanupResult = await this.performStorageCleanup(storage, dataSize);
        if (!cleanupResult.success) {
          return {
            success: false,
            id: '',
            error: `Storage full. Unable to free ${dataSize} bytes.`,
          };
        }
      }

      // Create conversation record
      const record: ConversationRecord = {
        id: exportData.id,
        title: exportData.title,
        site: exportData.site,
        url: exportData.url,
        exportedAt: exportData.exportedAt,
        lastModified: new Date().toISOString(),
        messageCount: exportData.metadata.messageCount,
        format: exportData.format,
        size: dataSize,
        tags,
        isFavorite,
        metadata: {
          extractionVersion: exportData.metadata.exportVersion,
          dataIntegrity: exportData.metadata.dataIntegrity,
          parsingErrors: exportData.metadata.parsingErrors,
          model: exportData.data.metadata?.model,
          language: exportData.data.metadata?.language,
        },
      };

      // Update storage
      storage.records.push(record);
      storage.data[exportData.id] = exportData.data;
      storage.totalSize += dataSize;
      storage.lastSync = new Date().toISOString();

      await this.saveConversationStorage(storage);

      return { success: true, id: exportData.id };
    } catch (error) {
      return {
        success: false,
        id: '',
        error: `Failed to save conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Retrieve conversations with query filtering
   */
  public async getConversations(query: ConversationQuery = {}): Promise<{
    records: ConversationRecord[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const storage = await this.getConversationStorage();
      let filteredRecords = storage.records;

      // Apply filters
      if (query.site) {
        filteredRecords = filteredRecords.filter((record) => record.site === query.site);
      }

      if (query.dateRange) {
        const fromDate = new Date(query.dateRange.from).getTime();
        const toDate = new Date(query.dateRange.to).getTime();
        filteredRecords = filteredRecords.filter((record) => {
          const recordDate = new Date(record.exportedAt).getTime();
          return recordDate >= fromDate && recordDate <= toDate;
        });
      }

      if (query.tags && query.tags.length > 0) {
        filteredRecords = filteredRecords.filter((record) =>
          query.tags!.some((tag) => record.tags.includes(tag))
        );
      }

      if (query.searchTerm) {
        const searchLower = query.searchTerm.toLowerCase();
        filteredRecords = filteredRecords.filter(
          (record) =>
            record.title.toLowerCase().includes(searchLower) ||
            record.url.toLowerCase().includes(searchLower) ||
            record.tags.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }

      if (query.isFavorite !== undefined) {
        filteredRecords = filteredRecords.filter(
          (record) => record.isFavorite === query.isFavorite
        );
      }

      // Apply sorting
      if (query.sortBy) {
        filteredRecords.sort((a, b) => {
          const aValue = a[query.sortBy!];
          const bValue = b[query.sortBy!];

          let comparison = 0;
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else {
            comparison = String(aValue).localeCompare(String(bValue));
          }

          return query.sortOrder === 'desc' ? -comparison : comparison;
        });
      } else {
        // Default sort by lastModified desc
        filteredRecords.sort(
          (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
      }

      // Apply pagination
      const total = filteredRecords.length;
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      const paginatedRecords = filteredRecords.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        records: paginatedRecords,
        total,
        hasMore,
      };
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return { records: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get conversation data by ID
   */
  public async getConversationData(id: string): Promise<ConversationData | null> {
    try {
      const storage = await this.getConversationStorage();
      return storage.data[id] || null;
    } catch (error) {
      console.error('Failed to get conversation data:', error);
      return null;
    }
  }

  /**
   * Update conversation record metadata
   */
  public async updateConversation(
    id: string,
    updates: Partial<Pick<ConversationRecord, 'title' | 'tags' | 'isFavorite'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storage = await this.getConversationStorage();
      const recordIndex = storage.records.findIndex((record) => record.id === id);

      if (recordIndex === -1) {
        return { success: false, error: 'Conversation not found' };
      }

      // Update record
      const record = storage.records[recordIndex];
      Object.assign(record, updates, { lastModified: new Date().toISOString() });

      storage.lastSync = new Date().toISOString();
      await this.saveConversationStorage(storage);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete conversation by ID
   */
  public async deleteConversation(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storage = await this.getConversationStorage();
      const recordIndex = storage.records.findIndex((record) => record.id === id);

      if (recordIndex === -1) {
        return { success: false, error: 'Conversation not found' };
      }

      // Remove record and data
      const record = storage.records[recordIndex];
      storage.records.splice(recordIndex, 1);
      delete storage.data[id];
      storage.totalSize -= record.size;
      storage.lastSync = new Date().toISOString();

      await this.saveConversationStorage(storage);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalConversations: number;
    totalSize: number;
    availableSize: number;
    usagePercentage: number;
    siteDistribution: Record<SupportedAISite, number>;
    lastSync: string;
  }> {
    try {
      const storage = await this.getConversationStorage();

      // Calculate site distribution
      const siteDistribution = storage.records.reduce(
        (acc, record) => {
          acc[record.site] = (acc[record.site] || 0) + 1;
          return acc;
        },
        {} as Record<SupportedAISite, number>
      );

      return {
        totalConversations: storage.records.length,
        totalSize: storage.totalSize,
        availableSize: this.MAX_STORAGE_SIZE - storage.totalSize,
        usagePercentage: (storage.totalSize / this.MAX_STORAGE_SIZE) * 100,
        siteDistribution,
        lastSync: storage.lastSync,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalConversations: 0,
        totalSize: 0,
        availableSize: this.MAX_STORAGE_SIZE,
        usagePercentage: 0,
        siteDistribution: {} as Record<SupportedAISite, number>,
        lastSync: new Date().toISOString(),
      };
    }
  }

  /**
   * Perform bulk operations
   */
  public async bulkOperations(operations: {
    delete?: string[];
    updateTags?: { id: string; tags: string[] }[];
    setFavorite?: { id: string; isFavorite: boolean }[];
  }): Promise<ConversationSyncResult> {
    let recordsProcessed = 0;
    const errors: string[] = [];

    try {
      const storage = await this.getConversationStorage();

      // Delete operations
      if (operations.delete && operations.delete.length > 0) {
        for (const id of operations.delete) {
          const recordIndex = storage.records.findIndex((record) => record.id === id);
          if (recordIndex !== -1) {
            const record = storage.records[recordIndex];
            storage.records.splice(recordIndex, 1);
            delete storage.data[id];
            storage.totalSize -= record.size;
            recordsProcessed++;
          } else {
            errors.push(`Conversation not found for deletion: ${id}`);
          }
        }
      }

      // Update tags operations
      if (operations.updateTags && operations.updateTags.length > 0) {
        for (const update of operations.updateTags) {
          const record = storage.records.find((r) => r.id === update.id);
          if (record) {
            record.tags = update.tags;
            record.lastModified = new Date().toISOString();
            recordsProcessed++;
          } else {
            errors.push(`Conversation not found for tag update: ${update.id}`);
          }
        }
      }

      // Set favorite operations
      if (operations.setFavorite && operations.setFavorite.length > 0) {
        for (const update of operations.setFavorite) {
          const record = storage.records.find((r) => r.id === update.id);
          if (record) {
            record.isFavorite = update.isFavorite;
            record.lastModified = new Date().toISOString();
            recordsProcessed++;
          } else {
            errors.push(`Conversation not found for favorite update: ${update.id}`);
          }
        }
      }

      storage.lastSync = new Date().toISOString();
      await this.saveConversationStorage(storage);

      return {
        success: true,
        recordsProcessed,
        duplicatesSkipped: 0,
        errors,
        storageUsed: storage.totalSize,
        storageAvailable: this.MAX_STORAGE_SIZE - storage.totalSize,
      };
    } catch (error) {
      return {
        success: false,
        recordsProcessed,
        duplicatesSkipped: 0,
        errors: [
          `Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        storageUsed: 0,
        storageAvailable: this.MAX_STORAGE_SIZE,
      };
    }
  }

  /**
   * Export conversations for backup
   */
  public async exportConversations(ids?: string[]): Promise<{
    success: boolean;
    data?: { records: ConversationRecord[]; conversations: Record<string, ConversationData> };
    error?: string;
  }> {
    try {
      const storage = await this.getConversationStorage();

      let recordsToExport = storage.records;
      if (ids && ids.length > 0) {
        recordsToExport = storage.records.filter((record) => ids.includes(record.id));
      }

      const conversationsToExport = recordsToExport.reduce(
        (acc, record) => {
          acc[record.id] = storage.data[record.id];
          return acc;
        },
        {} as Record<string, ConversationData>
      );

      return {
        success: true,
        data: {
          records: recordsToExport,
          conversations: conversationsToExport,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Private helper methods
   */

  private async getConversationStorage(): Promise<ConversationStorage> {
    try {
      const result = await this.storageManager.get<ConversationStorage>(this.STORAGE_KEY);
      return (
        result || {
          records: [],
          data: {},
          lastSync: new Date().toISOString(),
          totalSize: 0,
          version: '1.0.0',
        }
      );
    } catch (error) {
      console.warn('Failed to load conversation storage, using default:', error);
      return {
        records: [],
        data: {},
        lastSync: new Date().toISOString(),
        totalSize: 0,
        version: '1.0.0',
      };
    }
  }

  private async saveConversationStorage(storage: ConversationStorage): Promise<void> {
    await this.storageManager.set(this.STORAGE_KEY, storage);
  }

  private findDuplicateConversation(
    storage: ConversationStorage,
    exportData: ConversationExport
  ): ConversationRecord | null {
    return (
      storage.records.find(
        (record) =>
          record.url === exportData.url &&
          record.site === exportData.site &&
          Math.abs(
            new Date(record.exportedAt).getTime() - new Date(exportData.exportedAt).getTime()
          ) < 60000 // Within 1 minute
      ) || null
    );
  }

  private calculateDataSize(data: ConversationData): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // UTF-16 estimation
    }
  }

  private async performStorageCleanup(
    storage: ConversationStorage,
    requiredSpace: number
  ): Promise<{ success: boolean; freedSpace: number }> {
    let freedSpace = 0;
    const targetSpace = requiredSpace * 1.2; // 20% buffer

    // Sort by least recently accessed (not favorite)
    const sortedRecords = [...storage.records]
      .filter((record) => !record.isFavorite) // Don't delete favorites
      .sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());

    for (const record of sortedRecords) {
      if (freedSpace >= targetSpace) break;

      // Remove record and data
      const index = storage.records.indexOf(record);
      if (index !== -1) {
        storage.records.splice(index, 1);
        delete storage.data[record.id];
        storage.totalSize -= record.size;
        freedSpace += record.size;
      }
    }

    return {
      success: freedSpace >= requiredSpace,
      freedSpace,
    };
  }

  /**
   * Get all unique tags across conversations
   */
  public async getAllTags(): Promise<string[]> {
    try {
      const storage = await this.getConversationStorage();
      const tagSet = new Set<string>();

      storage.records.forEach((record) => {
        record.tags.forEach((tag) => tagSet.add(tag));
      });

      return Array.from(tagSet).sort();
    } catch (error) {
      console.error('Failed to get all tags:', error);
      return [];
    }
  }
}

export default ConversationManager;
