// Prompt-specific Storage Adapter
// TASK-0020: Background Script プロンプト管理統合

import type {
  Prompt,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptSearchOptions,
  PromptMetadata,
} from '@/types';
import { StorageManager } from './storage-manager';
import {
  generatePromptId,
  createDefaultPromptMetadata,
  validatePromptTitle,
  validatePromptContent,
  validateTags,
} from '@/types';
import type { StorageAdapter } from './prompt-manager';

/**
 * Chrome Storage based implementation of StorageAdapter for prompts
 */
export class PromptStorageAdapter implements StorageAdapter {
  private storageManager: StorageManager;
  private readonly PROMPTS_KEY = 'prompts';
  private readonly METADATA_KEY = 'prompt_metadata';

  constructor() {
    this.storageManager = new StorageManager();
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    try {
      const prompts = await this.getAllPrompts();
      return prompts.find((p) => p.id === id) || null;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      return null;
    }
  }

  async savePrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    try {
      // Generate new prompt with timestamps
      const now = new Date().toISOString();
      const newPrompt: Prompt = {
        id: generatePromptId(),
        createdAt: now,
        updatedAt: now,
        metadata: {
          ...createDefaultPromptMetadata(),
          ...promptData.metadata,
        },
        ...promptData,
      };

      // Validate the prompt
      this.validatePrompt(newPrompt);

      // Get existing prompts
      const prompts = await this.getAllPrompts();

      // Add new prompt
      prompts.push(newPrompt);

      // Save updated list
      await this.storageManager.set(this.PROMPTS_KEY, prompts);

      // Update metadata
      await this.updateMetadata(prompts);

      return newPrompt;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save prompt: ${message}`);
    }
  }

  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt> {
    try {
      const prompts = await this.getAllPrompts();
      const promptIndex = prompts.findIndex((p) => p.id === id);

      if (promptIndex === -1) {
        throw new Error('Prompt not found');
      }

      const existingPrompt = prompts[promptIndex];

      // Create updated prompt
      const updatedPrompt: Prompt = {
        ...existingPrompt,
        ...updates,
        id, // Ensure ID doesn't change
        createdAt: existingPrompt.createdAt, // Preserve creation date
        updatedAt: new Date().toISOString(),
        metadata: {
          ...existingPrompt.metadata,
          ...updates.metadata,
        },
      };

      // Validate updated prompt
      this.validatePrompt(updatedPrompt);

      // Update in array
      prompts[promptIndex] = updatedPrompt;

      // Save updated list
      await this.storageManager.set(this.PROMPTS_KEY, prompts);

      // Update metadata
      await this.updateMetadata(prompts);

      return updatedPrompt;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update prompt: ${message}`);
    }
  }

  async deletePrompt(id: string): Promise<boolean> {
    try {
      const prompts = await this.getAllPrompts();
      const promptIndex = prompts.findIndex((p) => p.id === id);

      if (promptIndex === -1) {
        return false;
      }

      // Remove prompt from array
      prompts.splice(promptIndex, 1);

      // Save updated list
      await this.storageManager.set(this.PROMPTS_KEY, prompts);

      // Update metadata
      await this.updateMetadata(prompts);

      return true;
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      return false;
    }
  }

  async getPrompts(): Promise<Prompt[]> {
    return await this.getAllPrompts();
  }

  async searchPrompts(options: PromptSearchOptions): Promise<Prompt[]> {
    try {
      const allPrompts = await this.getAllPrompts();
      let results = [...allPrompts];

      // Apply query filter
      if (options.query) {
        const query = options.query.toLowerCase();
        results = results.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.content.toLowerCase().includes(query) ||
            p.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      // Apply tag filter
      if (options.tags && options.tags.length > 0) {
        results = results.filter((p) => options.tags!.some((tag) => p.tags.includes(tag)));
      }

      // Apply category filter
      if (options.categoryId) {
        results = results.filter((p) => p.categoryId === options.categoryId);
      }

      // Apply sorting
      const sortBy = options.sortBy || 'updatedAt';
      const sortOrder = options.sortOrder || 'desc';

      results.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'updatedAt':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          case 'usageCount':
            aValue = a.metadata.usageCount;
            bValue = b.metadata.usageCount;
            break;
          case 'lastUsedAt':
            aValue = a.metadata.lastUsedAt || '';
            bValue = b.metadata.lastUsedAt || '';
            break;
          default:
            aValue = a.updatedAt;
            bValue = b.updatedAt;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          const numA = Number(aValue);
          const numB = Number(bValue);
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
      });

      // Apply pagination
      if (options.offset || options.limit) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        results = results.slice(start, end);
      }

      return results;
    } catch (error) {
      console.error('Failed to search prompts:', error);
      return [];
    }
  }

  /**
   * Get all prompts from storage
   */
  private async getAllPrompts(): Promise<Prompt[]> {
    try {
      const prompts = await this.storageManager.get<Prompt[]>(this.PROMPTS_KEY);
      return Array.isArray(prompts) ? prompts : [];
    } catch (error) {
      console.error('Failed to get all prompts:', error);
      return [];
    }
  }

  /**
   * Validate prompt data
   */
  private validatePrompt(prompt: Prompt): void {
    const titleErrors = validatePromptTitle(prompt.title);
    const contentErrors = validatePromptContent(prompt.content);
    const tagErrors = validateTags(prompt.tags);

    const allErrors = [...titleErrors, ...contentErrors, ...tagErrors];

    if (allErrors.length > 0) {
      throw new Error(`Validation failed: ${allErrors.join(', ')}`);
    }
  }

  /**
   * Update storage metadata
   */
  private async updateMetadata(prompts: Prompt[]): Promise<void> {
    try {
      const metadata = {
        totalPrompts: prompts.length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      };

      await this.storageManager.set(this.METADATA_KEY, metadata);
    } catch (error) {
      // Metadata update failure is not critical
      console.warn('Failed to update prompt metadata:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalPrompts: number;
    storageUsage: number;
    availableSpace: number;
    lastUpdated: string | null;
  }> {
    try {
      const prompts = await this.getAllPrompts();
      const storageInfo = await this.storageManager.getStorageInfo();
      const metadata = await this.storageManager.get<any>(this.METADATA_KEY);

      return {
        totalPrompts: prompts.length,
        storageUsage: storageInfo.bytesInUse,
        availableSpace: storageInfo.availableSpace,
        lastUpdated: metadata?.lastUpdated || null,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalPrompts: 0,
        storageUsage: 0,
        availableSpace: 0,
        lastUpdated: null,
      };
    }
  }

  /**
   * Clear all prompts (for testing/reset purposes)
   */
  async clearAllPrompts(): Promise<boolean> {
    try {
      await this.storageManager.set(this.PROMPTS_KEY, []);
      await this.storageManager.remove(this.METADATA_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear all prompts:', error);
      return false;
    }
  }
}
