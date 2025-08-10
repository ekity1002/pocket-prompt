// Core business logic for prompt management
// This module handles all prompt-related operations following Clean Architecture principles

import type { Prompt, CreatePromptRequest, UpdatePromptRequest, PromptSearchOptions } from '@/types';

/**
 * Core Prompt Management Service
 * Handles business logic for prompt operations
 */
export class PromptManager {
  private storage: any; // Will be injected via dependency injection

  constructor(storageAdapter: any) {
    this.storage = storageAdapter;
  }

  /**
   * Create a new prompt
   */
  async createPrompt(request: CreatePromptRequest): Promise<Prompt> {
    // Business logic validation
    if (!request.title.trim()) {
      throw new Error('Prompt title is required');
    }
    
    if (!request.content.trim()) {
      throw new Error('Prompt content is required');
    }

    if (request.title.length > 200) {
      throw new Error('Prompt title must be 200 characters or less');
    }

    if (request.content.length > 10000) {
      throw new Error('Prompt content must be 10,000 characters or less');
    }

    const prompt: Prompt = {
      id: this.generateId(),
      title: request.title.trim(),
      content: request.content.trim(),
      tags: request.tags || [],
      categoryId: request.categoryId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        usageCount: 0,
        lastUsedAt: null,
        isFavorite: request.metadata?.isFavorite || false,
        sourceUrl: request.metadata?.sourceUrl || null,
        aiModel: request.metadata?.aiModel || null,
      },
    };

    await this.storage.savePrompt(prompt);
    return prompt;
  }

  /**
   * Get prompt by ID
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    if (!id) {
      throw new Error('Prompt ID is required');
    }

    return await this.storage.getPrompt(id);
  }

  /**
   * Update existing prompt
   */
  async updatePrompt(id: string, request: UpdatePromptRequest): Promise<Prompt> {
    const existingPrompt = await this.getPrompt(id);
    if (!existingPrompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    // Validation
    if (request.title && request.title.length > 200) {
      throw new Error('Prompt title must be 200 characters or less');
    }

    if (request.content && request.content.length > 10000) {
      throw new Error('Prompt content must be 10,000 characters or less');
    }

    const updatedPrompt: Prompt = {
      ...existingPrompt,
      ...(request.title && { title: request.title.trim() }),
      ...(request.content && { content: request.content.trim() }),
      ...(request.tags && { tags: request.tags }),
      ...(request.categoryId !== undefined && { categoryId: request.categoryId }),
      updatedAt: new Date().toISOString(),
      metadata: {
        ...existingPrompt.metadata,
        ...request.metadata,
      },
    };

    await this.storage.savePrompt(updatedPrompt);
    return updatedPrompt;
  }

  /**
   * Delete prompt
   */
  async deletePrompt(id: string): Promise<void> {
    const prompt = await this.getPrompt(id);
    if (!prompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    await this.storage.deletePrompt(id);
  }

  /**
   * Search prompts with options
   */
  async searchPrompts(options: PromptSearchOptions): Promise<{
    prompts: Prompt[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return await this.storage.searchPrompts(options);
  }

  /**
   * Record prompt usage
   */
  async recordUsage(id: string): Promise<void> {
    const prompt = await this.getPrompt(id);
    if (!prompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }

    const updatedPrompt: Prompt = {
      ...prompt,
      metadata: {
        ...prompt.metadata,
        usageCount: prompt.metadata.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    await this.storage.savePrompt(updatedPrompt);
  }

  /**
   * Get frequently used prompts
   */
  async getFrequentlyUsed(limit = 10): Promise<Prompt[]> {
    const searchOptions: PromptSearchOptions = {
      query: '',
      sortBy: 'usageCount',
      sortOrder: 'desc',
      limit,
    };

    const result = await this.searchPrompts(searchOptions);
    return result.prompts;
  }

  /**
   * Get recently used prompts
   */
  async getRecentlyUsed(limit = 10): Promise<Prompt[]> {
    const searchOptions: PromptSearchOptions = {
      query: '',
      sortBy: 'lastUsedAt',
      sortOrder: 'desc',
      limit,
    };

    const result = await this.searchPrompts(searchOptions);
    return result.prompts.filter(p => p.metadata.lastUsedAt);
  }

  /**
   * Generate unique ID for prompts
   */
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}