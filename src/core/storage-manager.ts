// Storage Manager for Chrome Extension
// TASK-0018: ChatGPT会話データ管理実装

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Chrome Extension Storage Manager
 * Provides unified interface for chrome.storage.local operations
 */
export class StorageManager {
  private readonly STORAGE_QUOTA = 5 * 1024 * 1024; // 5MB Chrome extension limit

  /**
   * Get data from chrome.storage.local
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Storage get error:', error);
      throw new Error(
        `Failed to get storage data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Set data in chrome.storage.local
   */
  public async set<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      // Check storage quota before setting
      const dataSize = this.calculateDataSize(value);
      await this.checkStorageQuota(dataSize);

      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Storage set error:', error);
      throw new Error(
        `Failed to set storage data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove data from chrome.storage.local
   */
  public async remove(key: string): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw new Error(
        `Failed to remove storage data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all data from chrome.storage.local
   */
  public async clear(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw new Error(
        `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all keys from chrome.storage.local
   */
  public async getAllKeys(): Promise<string[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      const result = await chrome.storage.local.get(null);
      return Object.keys(result);
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      throw new Error(
        `Failed to get all keys: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get storage usage information
   */
  public async getStorageInfo(): Promise<{
    bytesInUse: number;
    quota: number;
    availableSpace: number;
    usagePercentage: number;
  }> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      const bytesInUse = await chrome.storage.local.getBytesInUse();

      return {
        bytesInUse,
        quota: this.STORAGE_QUOTA,
        availableSpace: this.STORAGE_QUOTA - bytesInUse,
        usagePercentage: (bytesInUse / this.STORAGE_QUOTA) * 100,
      };
    } catch (error) {
      console.error('Storage getStorageInfo error:', error);
      throw new Error(
        `Failed to get storage info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch get multiple keys
   */
  public async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      const result = await chrome.storage.local.get(keys);

      const output: Record<string, T | null> = {};
      for (const key of keys) {
        output[key] = result[key] || null;
      }

      return output;
    } catch (error) {
      console.error('Storage getMultiple error:', error);
      throw new Error(
        `Failed to get multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch set multiple key-value pairs
   */
  public async setMultiple<T>(data: Record<string, T>): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome storage not available');
      }

      // Check total data size
      const totalSize = Object.values(data).reduce((sum, value) => {
        return sum + this.calculateDataSize(value);
      }, 0);

      await this.checkStorageQuota(totalSize);

      await chrome.storage.local.set(data);
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      throw new Error(
        `Failed to set multiple keys: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a key exists
   */
  public async has(key: string): Promise<boolean> {
    try {
      const result = await this.get(key);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Calculate approximate data size for storage quota check
   */
  private calculateDataSize<T>(data: T): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // UTF-16 estimation
    }
  }

  /**
   * Check storage quota before writing
   */
  private async checkStorageQuota(additionalSize: number): Promise<void> {
    try {
      const storageInfo = await this.getStorageInfo();

      if (storageInfo.bytesInUse + additionalSize > this.STORAGE_QUOTA) {
        throw new Error(
          `Storage quota exceeded. Required: ${additionalSize} bytes, ` +
            `Available: ${storageInfo.availableSpace} bytes`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        throw error;
      }
      // If we can't check quota, proceed with the operation
      console.warn('Could not check storage quota:', error);
    }
  }
}

export default StorageManager;
