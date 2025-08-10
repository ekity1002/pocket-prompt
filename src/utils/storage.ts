// Storage utilities for Pocket Prompt Chrome Extension

import type { Prompt, Settings, StorageData, PromptFilter, PromptListOptions } from '@/types';

export class StorageManager {
  private static readonly STORAGE_KEYS = {
    PROMPTS: 'prompts',
    SETTINGS: 'settings',
    CATEGORIES: 'categories',
    TAGS: 'tags',
  } as const;

  /**
   * Get all prompts from storage
   */
  static async getPrompts(): Promise<Prompt[]> {
    try {
      const result = await chrome.storage.sync.get([this.STORAGE_KEYS.PROMPTS]);
      return result[this.STORAGE_KEYS.PROMPTS] || [];
    } catch (error) {
      console.error('Failed to get prompts:', error);
      throw new Error('Failed to load prompts from storage');
    }
  }

  /**
   * Save a new prompt
   */
  static async savePrompt(
    promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Prompt> {
    try {
      const prompts = await this.getPrompts();

      const newPrompt: Prompt = {
        ...promptData,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      prompts.push(newPrompt);
      await chrome.storage.sync.set({ [this.STORAGE_KEYS.PROMPTS]: prompts });

      // Update categories and tags
      await this.updateCategoriesAndTags(newPrompt);

      return newPrompt;
    } catch (error) {
      console.error('Failed to save prompt:', error);
      throw new Error('Failed to save prompt to storage');
    }
  }

  /**
   * Update an existing prompt
   */
  static async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>
  ): Promise<Prompt> {
    try {
      const prompts = await this.getPrompts();
      const index = prompts.findIndex((p) => p.id === id);

      if (index === -1) {
        throw new Error('Prompt not found');
      }

      const updatedPrompt: Prompt = {
        ...prompts[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      prompts[index] = updatedPrompt;
      await chrome.storage.sync.set({ [this.STORAGE_KEYS.PROMPTS]: prompts });

      // Update categories and tags
      await this.updateCategoriesAndTags(updatedPrompt);

      return updatedPrompt;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      throw new Error('Failed to update prompt in storage');
    }
  }

  /**
   * Delete a prompt
   */
  static async deletePrompt(id: string): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const filteredPrompts = prompts.filter((p) => p.id !== id);

      await chrome.storage.sync.set({ [this.STORAGE_KEYS.PROMPTS]: filteredPrompts });
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      throw new Error('Failed to delete prompt from storage');
    }
  }

  /**
   * Get prompts with filtering and sorting options
   */
  static async getFilteredPrompts(options: PromptListOptions = {}): Promise<Prompt[]> {
    try {
      let prompts = await this.getPrompts();

      // Apply filters
      if (options.filter) {
        prompts = this.applyFilters(prompts, options.filter);
      }

      // Apply sorting
      if (options.sortBy) {
        prompts = this.sortPrompts(prompts, options.sortBy, options.sortOrder || 'desc');
      }

      // Apply pagination
      if (options.offset !== undefined || options.limit !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || prompts.length;
        prompts = prompts.slice(offset, offset + limit);
      }

      return prompts;
    } catch (error) {
      console.error('Failed to get filtered prompts:', error);
      throw new Error('Failed to load filtered prompts');
    }
  }

  /**
   * Get settings from storage
   */
  static async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get([this.STORAGE_KEYS.SETTINGS]);
      return result[this.STORAGE_KEYS.SETTINGS] || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save settings to storage
   */
  static async saveSettings(settings: Partial<Settings>): Promise<Settings> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };

      await chrome.storage.sync.set({ [this.STORAGE_KEYS.SETTINGS]: newSettings });
      return newSettings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings to storage');
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const result = await chrome.storage.sync.get([this.STORAGE_KEYS.CATEGORIES]);
      return result[this.STORAGE_KEYS.CATEGORIES] || [];
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  /**
   * Get all tags
   */
  static async getTags(): Promise<string[]> {
    try {
      const result = await chrome.storage.sync.get([this.STORAGE_KEYS.TAGS]);
      return result[this.STORAGE_KEYS.TAGS] || [];
    } catch (error) {
      console.error('Failed to get tags:', error);
      return [];
    }
  }

  /**
   * Export all data
   */
  static async exportData(): Promise<StorageData> {
    try {
      const result = await chrome.storage.sync.get(null);
      return result as StorageData;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export data from storage');
    }
  }

  /**
   * Import data (replaces existing data)
   */
  static async importData(data: StorageData): Promise<void> {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(data);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Failed to import data to storage');
    }
  }

  // Private helper methods

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private static getDefaultSettings(): Settings {
    return {
      theme: 'system',
      autoSave: true,
      syncEnabled: true,
      autoTag: true,
      exportFormat: 'json',
      shortcuts: {
        capture: 'Alt+Shift+C',
        toggle: 'Alt+Shift+P',
      },
    };
  }

  private static applyFilters(prompts: Prompt[], filter: PromptFilter): Prompt[] {
    return prompts.filter((prompt) => {
      // Category filter
      if (filter.category && prompt.category !== filter.category) {
        return false;
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const promptTags = prompt.tags || [];
        const hasMatchingTag = filter.tags.some((tag) => promptTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Search query filter
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchableText = [
          prompt.title,
          prompt.content,
          prompt.category || '',
          ...(prompt.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Date range filter
      if (filter.dateRange) {
        const createdDate = new Date(prompt.createdAt);
        const fromDate = new Date(filter.dateRange.from);
        const toDate = new Date(filter.dateRange.to);

        if (createdDate < fromDate || createdDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }

  private static sortPrompts(
    prompts: Prompt[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): Prompt[] {
    return [...prompts].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private static async updateCategoriesAndTags(prompt: Prompt): Promise<void> {
    try {
      // Update categories
      if (prompt.category) {
        const categories = await this.getCategories();
        if (!categories.includes(prompt.category)) {
          categories.push(prompt.category);
          await chrome.storage.sync.set({ [this.STORAGE_KEYS.CATEGORIES]: categories });
        }
      }

      // Update tags
      if (prompt.tags && prompt.tags.length > 0) {
        const existingTags = await this.getTags();
        const newTags = [...new Set([...existingTags, ...prompt.tags])];
        await chrome.storage.sync.set({ [this.STORAGE_KEYS.TAGS]: newTags });
      }
    } catch (error) {
      console.error('Failed to update categories and tags:', error);
    }
  }
}
