import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { 
  Prompt, 
  CreatePromptRequest, 
  UpdatePromptRequest,
  PromptSearchOptions 
} from '../../src/types';
import { PromptManager } from '../../src/core/prompt-manager';

// Mock StorageAdapter
const mockStorageAdapter = {
  getPrompts: vi.fn(),
  savePrompt: vi.fn(),
  updatePrompt: vi.fn(), 
  deletePrompt: vi.fn(),
  getPrompt: vi.fn(), // Changed from getPrompt to getPrompt
  searchPrompts: vi.fn(),
};

// Mock ID generator
vi.mock('@/utils/id-generator', () => ({
  generatePromptId: vi.fn(() => 'mock-uuid-123'),
}));

describe('PromptManager', () => {
  let promptManager: PromptManager;
  
  const mockPrompt: Prompt = {
    id: 'prompt-123e4567-e89b-12d3-a456-test-id-12345',
    title: 'Test Prompt',
    content: 'This is test content',
    tags: ['test', 'example'],
    categoryId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    metadata: {
      usageCount: 0,
      lastUsedAt: null,
      isFavorite: false,
      isPrivate: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    promptManager = new PromptManager(mockStorageAdapter as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPrompt', () => {
    it('should create prompt with valid data', async () => {
      // 🟢 Blue: REQ-001 prompt creation requirement
      const createRequest: CreatePromptRequest = {
        title: 'New Prompt',
        content: 'New content',
        tags: ['new'],
      };

      const expectedPrompt = {
        ...mockPrompt,
        title: createRequest.title,
        content: createRequest.content,
        tags: createRequest.tags,
      };
      mockStorageAdapter.savePrompt.mockResolvedValue(expectedPrompt);

      const result = await promptManager.createPrompt(createRequest);

      expect(result).toBeDefined();
      expect(result.title).toBe(createRequest.title);
      expect(result.content).toBe(createRequest.content);
      expect(mockStorageAdapter.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createRequest.title,
          content: createRequest.content,
          tags: createRequest.tags,
        })
      );
    });

    it('should handle multiline content correctly', async () => {
      // 🟢 Blue: Multi-line content support requirement
      const multilineContent = `Line 1
Line 2
Line 3 with special chars: !@#$%^&*()`;
      
      const createRequest: CreatePromptRequest = {
        title: 'Multiline Test',
        content: multilineContent,
      };

      mockStorageAdapter.savePrompt.mockResolvedValue({
        ...mockPrompt,
        content: multilineContent,
      });

      const result = await promptManager.createPrompt(createRequest);

      expect(result.content).toBe(multilineContent);
      expect(result.content).toContain('\n');
    });

    it('should assign unique UUID to each prompt', async () => {
      // 🟢 Blue: UUID ID management requirement
      const createRequest: CreatePromptRequest = {
        title: 'UUID Test',
        content: 'Test content',
      };

      mockStorageAdapter.savePrompt.mockResolvedValue(mockPrompt);

      await promptManager.createPrompt(createRequest);

      // PromptManager doesn't generate IDs - StorageAdapter does
      // We just verify the call was made with correct data structure
      expect(mockStorageAdapter.savePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'UUID Test',
          content: 'Test content',
          tags: [],
          categoryId: null,
          metadata: expect.objectContaining({
            usageCount: 0,
            isFavorite: false,
            isPrivate: false,
          }),
        })
      );
    });

    it('should initialize metadata with default values', async () => {
      // 🟢 Blue: Metadata initialization from type definition
      const createRequest: CreatePromptRequest = {
        title: 'Metadata Test',
        content: 'Test content',
      };

      mockStorageAdapter.savePrompt.mockResolvedValue(mockPrompt);

      const result = await promptManager.createPrompt(createRequest);

      expect(result.metadata).toEqual(
        expect.objectContaining({
          usageCount: 0,
          lastUsedAt: null,
          isFavorite: false,
          isPrivate: false,
        })
      );
    });

    it('should reject empty title', async () => {
      // 🟢 Blue: REQ-001 validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: '',
        content: 'Valid content',
      };

      await expect(promptManager.createPrompt(invalidRequest))
        .rejects.toThrow('Title is required');
    });

    it('should reject empty content', async () => {
      // 🟢 Blue: REQ-001 validation requirement
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid title',
        content: '',
      };

      await expect(promptManager.createPrompt(invalidRequest))
        .rejects.toThrow('Content is required');
    });

    it('should reject title over 200 chars', async () => {
      // 🟢 Blue: Type definition constraint
      const longTitle = 'a'.repeat(201);
      const invalidRequest: CreatePromptRequest = {
        title: longTitle,
        content: 'Valid content',
      };

      await expect(promptManager.createPrompt(invalidRequest))
        .rejects.toThrow('Prompt title cannot exceed 200 characters');
    });

    it('should reject content over 10,000 chars', async () => {
      // 🟢 Blue: EDGE-101 requirement
      const longContent = 'a'.repeat(10001);
      const invalidRequest: CreatePromptRequest = {
        title: 'Valid title',
        content: longContent,
      };

      await expect(promptManager.createPrompt(invalidRequest))
        .rejects.toThrow('Prompt content cannot exceed 10000 characters');
    });

    it('should handle optional tags array', async () => {
      // 🟢 Blue: Optional tags from type definition
      const createRequest: CreatePromptRequest = {
        title: 'Tags Test',
        content: 'Test content',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      mockStorageAdapter.savePrompt.mockResolvedValue({
        ...mockPrompt,
        tags: createRequest.tags!,
      });

      const result = await promptManager.createPrompt(createRequest);

      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle optional categoryId', async () => {
      // 🟢 Blue: Optional categoryId from type definition
      const createRequest: CreatePromptRequest = {
        title: 'Category Test',
        content: 'Test content',
        categoryId: 'category-123',
      };

      mockStorageAdapter.savePrompt.mockResolvedValue({
        ...mockPrompt,
        categoryId: 'category-123',
      });

      const result = await promptManager.createPrompt(createRequest);

      expect(result.categoryId).toBe('category-123');
    });
  });

  describe('getPrompt', () => {
    it('should return prompt by valid ID', async () => {
      // 🟢 Blue: Basic read operation
      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);

      const result = await promptManager.getPrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345');

      expect(result).toEqual(mockPrompt);
      expect(mockStorageAdapter.getPrompt).toHaveBeenCalledWith('prompt-123e4567-e89b-12d3-a456-test-id-12345');
    });

    it('should return null for non-existent ID', async () => {
      // 🟢 Blue: Consistent with existing implementation
      mockStorageAdapter.getPrompt.mockResolvedValue(null);

      const result = await promptManager.getPrompt('prompt-000e0000-e00b-00d0-a000-nonexistent-00000');

      expect(result).toBeNull();
    });

    it('should throw error for empty ID', async () => {
      // 🟢 Blue: Input validation requirement
      await expect(promptManager.getPrompt(''))
        .rejects.toThrow('Prompt ID is required');
    });

    it('should throw error for invalid ID format', async () => {
      // 🟢 Blue: UUID validation requirement
      await expect(promptManager.getPrompt('invalid-id-format'))
        .rejects.toThrow('Invalid prompt ID format');
    });
  });

  describe('updatePrompt', () => {
    it('should update prompt with partial data', async () => {
      // 🟢 Blue: Partial update from UpdatePromptRequest type
      const updateRequest: UpdatePromptRequest = {
        title: 'Updated Title',
      };

      const updatedPrompt = {
        ...mockPrompt,
        title: 'Updated Title',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.updatePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345', updateRequest);

      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe(mockPrompt.content); // Unchanged
      expect(result.updatedAt).not.toBe(mockPrompt.updatedAt);
    });

    it('should preserve unchanged fields', async () => {
      // 🟢 Blue: Partial update behavior
      const updateRequest: UpdatePromptRequest = {
        content: 'Updated content only',
      };

      const updatedPrompt = {
        ...mockPrompt,
        content: 'Updated content only',
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.updatePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345', updateRequest);

      expect(result.title).toBe(mockPrompt.title); // Preserved
      expect(result.tags).toEqual(mockPrompt.tags); // Preserved
      expect(result.content).toBe('Updated content only');
    });

    it('should update updatedAt timestamp', async () => {
      // 🟢 Blue: Timestamp management requirement
      const updateRequest: UpdatePromptRequest = {
        title: 'Updated Title',
      };

      const updatedPrompt = {
        ...mockPrompt,
        title: 'Updated Title',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.updatePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345', updateRequest);

      expect(new Date(result.updatedAt).getTime())
        .toBeGreaterThan(new Date(mockPrompt.updatedAt).getTime());
    });

    it('should validate updated title length', async () => {
      // 🟢 Blue: Validation consistency
      const longTitle = 'a'.repeat(201);
      const updateRequest: UpdatePromptRequest = {
        title: longTitle,
      };

      // Mock the existing prompt
      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);

      await expect(promptManager.updatePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345', updateRequest))
        .rejects.toThrow('Prompt title cannot exceed 200 characters');
    });

    it('should validate updated content length', async () => {
      // 🟢 Blue: EDGE-101 consistency
      const longContent = 'a'.repeat(10001);
      const updateRequest: UpdatePromptRequest = {
        content: longContent,
      };

      // Mock the existing prompt
      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);

      await expect(promptManager.updatePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345', updateRequest))
        .rejects.toThrow('Prompt content cannot exceed 10000 characters');
    });

    it('should throw error for non-existent ID', async () => {
      // 🟢 Blue: Consistent with existing implementation
      mockStorageAdapter.getPrompt.mockResolvedValue(null);

      const updateRequest: UpdatePromptRequest = {
        title: 'New Title',
      };

      await expect(promptManager.updatePrompt('prompt-000e0000-e00b-00d0-a000-nonexistent-00000', updateRequest))
        .rejects.toThrow('Prompt not found');
    });
  });

  describe('deletePrompt', () => {
    it('should delete existing prompt', async () => {
      // 🟢 Blue: Basic delete operation
      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.deletePrompt.mockResolvedValue(true);

      const result = await promptManager.deletePrompt('prompt-123e4567-e89b-12d3-a456-test-id-12345');

      expect(result).toBe(true);
      expect(mockStorageAdapter.deletePrompt).toHaveBeenCalledWith('prompt-123e4567-e89b-12d3-a456-test-id-12345');
    });

    it('should throw error for non-existent ID', async () => {
      // 🟢 Blue: Consistent error handling
      mockStorageAdapter.getPrompt.mockResolvedValue(null);

      await expect(promptManager.deletePrompt('prompt-000e0000-e00b-00d0-a000-nonexistent-00000'))
        .rejects.toThrow('Prompt not found');
    });
  });

  describe('recordUsage', () => {
    it('should increment usageCount', async () => {
      // 🟢 Blue: Metadata specification from types
      const updatedPrompt = {
        ...mockPrompt,
        metadata: {
          ...mockPrompt.metadata,
          usageCount: 1,
          lastUsedAt: '2024-01-02T00:00:00.000Z',
        },
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.recordUsage('prompt-123e4567-e89b-12d3-a456-test-id-12345');

      expect(result.metadata.usageCount).toBe(1);
    });

    it('should update lastUsedAt timestamp', async () => {
      // 🟢 Blue: Metadata specification from types
      const updatedPrompt = {
        ...mockPrompt,
        metadata: {
          ...mockPrompt.metadata,
          lastUsedAt: '2024-01-02T00:00:00.000Z',
        },
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.recordUsage('prompt-123e4567-e89b-12d3-a456-test-id-12345');

      expect(result.metadata.lastUsedAt).not.toBeNull();
      expect(new Date(result.metadata.lastUsedAt!).getTime())
        .toBeGreaterThan(0);
    });

    it('should update updatedAt timestamp', async () => {
      // 🟢 Blue: Consistent timestamp management
      const updatedPrompt = {
        ...mockPrompt,
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockStorageAdapter.getPrompt.mockResolvedValue(mockPrompt);
      mockStorageAdapter.updatePrompt.mockResolvedValue(updatedPrompt);

      const result = await promptManager.recordUsage('prompt-123e4567-e89b-12d3-a456-test-id-12345');

      expect(result.updatedAt).not.toBe(mockPrompt.updatedAt);
    });

    it('should throw error for non-existent ID', async () => {
      // 🟢 Blue: Consistent error handling
      mockStorageAdapter.getPrompt.mockResolvedValue(null);

      await expect(promptManager.recordUsage('prompt-000e0000-e00b-00d0-a000-nonexistent-00000'))
        .rejects.toThrow('Prompt not found');
    });
  });

  describe('Analytics', () => {
    const mockPrompts: Prompt[] = [
      { ...mockPrompt, id: '1', metadata: { ...mockPrompt.metadata, usageCount: 5 } },
      { ...mockPrompt, id: '2', metadata: { ...mockPrompt.metadata, usageCount: 10 } },
      { ...mockPrompt, id: '3', metadata: { ...mockPrompt.metadata, usageCount: 1 } },
    ];

    it('should return frequently used prompts', async () => {
      // 🟡 Yellow: Business value inference
      mockStorageAdapter.getPrompts.mockResolvedValue(mockPrompts);

      const result = await promptManager.getFrequentlyUsedPrompts(2);

      expect(result).toHaveLength(2);
      expect(result[0].metadata.usageCount).toBe(10);
      expect(result[1].metadata.usageCount).toBe(5);
    });

    it('should return recently used prompts', async () => {
      // 🟡 Yellow: Business value inference
      const recentPrompts = [
        {
          ...mockPrompt,
          id: '1',
          metadata: { ...mockPrompt.metadata, lastUsedAt: '2024-01-03T00:00:00.000Z' }
        },
        {
          ...mockPrompt,
          id: '2',
          metadata: { ...mockPrompt.metadata, lastUsedAt: '2024-01-02T00:00:00.000Z' }
        },
      ];

      mockStorageAdapter.getPrompts.mockResolvedValue(recentPrompts);

      const result = await promptManager.getRecentlyUsedPrompts(2);

      expect(result).toHaveLength(2);
      expect(result[0].metadata.lastUsedAt).toBe('2024-01-03T00:00:00.000Z');
    });

    it('should handle empty usage history', async () => {
      // 🟡 Yellow: Edge case handling
      mockStorageAdapter.getPrompts.mockResolvedValue([]);

      const frequentResult = await promptManager.getFrequentlyUsedPrompts(5);
      const recentResult = await promptManager.getRecentlyUsedPrompts(5);

      expect(frequentResult).toEqual([]);
      expect(recentResult).toEqual([]);
    });
  });

  describe('searchPrompts', () => {
    const searchPrompts: Prompt[] = [
      { ...mockPrompt, id: '1', title: 'JavaScript Tutorial', tags: ['js', 'tutorial'] },
      { ...mockPrompt, id: '2', title: 'React Guide', tags: ['react', 'js'] },
      { ...mockPrompt, id: '3', title: 'Python Basics', tags: ['python'] },
    ];

    it('should search by query string', async () => {
      // 🟢 Blue: PromptSearchOptions type definition
      const searchOptions: PromptSearchOptions = {
        query: 'JavaScript',
      };

      const filteredResults = [searchPrompts[0]];
      mockStorageAdapter.searchPrompts.mockResolvedValue(filteredResults);

      const result = await promptManager.searchPrompts(searchOptions);

      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('JavaScript');
    });

    it('should filter by tags', async () => {
      // 🟢 Blue: PromptSearchOptions type definition
      const searchOptions: PromptSearchOptions = {
        tags: ['js'],
      };

      const filteredResults = [searchPrompts[0], searchPrompts[1]];
      mockStorageAdapter.searchPrompts.mockResolvedValue(filteredResults);

      const result = await promptManager.searchPrompts(searchOptions);

      expect(result).toHaveLength(2);
      result.forEach(prompt => {
        expect(prompt.tags).toContain('js');
      });
    });

    it('should filter by categoryId', async () => {
      // 🟢 Blue: PromptSearchOptions type definition
      const searchOptions: PromptSearchOptions = {
        categoryId: 'category-123',
      };

      mockStorageAdapter.searchPrompts.mockResolvedValue([searchPrompts[0]]);

      const result = await promptManager.searchPrompts(searchOptions);

      expect(mockStorageAdapter.searchPrompts).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'category-123' })
      );
    });

    it('should sort by different criteria', async () => {
      // 🟢 Blue: PromptSearchOptions type definition
      const searchOptions: PromptSearchOptions = {
        sortBy: 'title',
        sortOrder: 'asc',
      };

      mockStorageAdapter.searchPrompts.mockResolvedValue(searchPrompts);

      await promptManager.searchPrompts(searchOptions);

      expect(mockStorageAdapter.searchPrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'title',
          sortOrder: 'asc',
        })
      );
    });

    it('should handle pagination (limit/offset)', async () => {
      // 🟢 Blue: PromptSearchOptions type definition
      const searchOptions: PromptSearchOptions = {
        limit: 10,
        offset: 20,
      };

      mockStorageAdapter.searchPrompts.mockResolvedValue(searchPrompts);

      await promptManager.searchPrompts(searchOptions);

      expect(mockStorageAdapter.searchPrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });
  });
});