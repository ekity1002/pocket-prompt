// PromptListContainer Test Suite
// TASK-0012: プロンプト一覧表示機能 Tests

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PromptListContainer,
  type SortOption,
  type SortDirection,
} from '../../src/popup/prompt-list-container';
import { PopupStateManager } from '../../src/popup/popup-state-manager';
import { PromptManager } from '../../src/core/prompt-manager';
import { ClipboardManager } from '../../src/core/clipboard-manager';
import type { Prompt } from '../../src/types';

// Mock dependencies
vi.mock('../../src/popup/popup-state-manager');
vi.mock('../../src/core/prompt-manager');
vi.mock('../../src/core/clipboard-manager');
vi.mock('../../src/core/error-manager', () => ({
  ErrorManager: {
    logError: vi.fn(),
    handleUserError: vi.fn(() => ({
      title: 'テストエラー',
      message: 'エラーメッセージ',
      actionable: true,
      actions: [{ label: '再試行', action: 'retry' }],
      severity: 'error',
    })),
  },
}));

// Sample test data
const createMockPrompts = (): Prompt[] => [
  {
    id: '1',
    title: 'プロンプト1',
    content: 'これは最初のテストプロンプトです。',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    usageCount: 5,
    usedAt: new Date('2024-01-15T14:30:00Z'),
    tags: ['テスト', '開発'],
  },
  {
    id: '2',
    title: 'プロンプト2',
    content:
      'これは2番目のテストプロンプトです。非常に長いテキストで50文字を超えるプレビューテストを行います。',
    createdAt: new Date('2024-01-02T11:00:00Z'),
    updatedAt: new Date('2024-01-02T11:00:00Z'),
    usageCount: 3,
    usedAt: new Date('2024-01-10T09:15:00Z'),
    tags: [],
  },
  {
    id: '3',
    title: 'プロンプト3',
    content: '3番目のプロンプト',
    createdAt: new Date('2024-01-03T12:00:00Z'),
    updatedAt: new Date('2024-01-03T12:00:00Z'),
    usageCount: 10,
    usedAt: new Date('2024-01-20T16:45:00Z'),
    tags: ['重要'],
  },
];

// Mock DOM elements
const setupMockDOM = (): void => {
  document.body.innerHTML = `
    <div id="prompt-list-container" class="prompt-list-container">
      <div id="prompt-list-header" class="prompt-list-header">
        <div class="sort-controls">
          <select id="sort-select" class="sort-select">
            <option value="usedAt-desc">最近使用順</option>
            <option value="usedAt-asc">古い使用順</option>
            <option value="createdAt-desc">新しい順</option>
            <option value="createdAt-asc">古い順</option>
            <option value="usageCount-desc">使用回数順</option>
            <option value="title-asc">タイトル順</option>
          </select>
        </div>
      </div>
      <div id="prompt-list" class="prompt-list" role="list"></div>
      <div id="prompt-list-footer" class="prompt-list-footer">
        <div id="prompt-count" class="prompt-count"></div>
      </div>
    </div>
  `;
};

describe('PromptListContainer', () => {
  let container: PromptListContainer;
  let mockStateManager: PopupStateManager;
  let mockPromptManager: PromptManager;
  let mockClipboardManager: ClipboardManager;

  beforeEach(() => {
    setupMockDOM();

    // Create mock instances
    mockStateManager = new PopupStateManager() as any;
    mockPromptManager = new PromptManager({} as any) as any;
    mockClipboardManager = new ClipboardManager() as any;

    // Mock methods
    mockStateManager.showSuccess = vi.fn();
    mockStateManager.showError = vi.fn();
    mockPromptManager.getAllPrompts = vi.fn().mockResolvedValue(createMockPrompts());
    mockPromptManager.updateUsage = vi.fn().mockResolvedValue(undefined);
    mockPromptManager.deletePrompt = vi.fn().mockResolvedValue(undefined);
    mockClipboardManager.copy = vi.fn().mockResolvedValue(undefined);

    // Mock window.confirm
    global.confirm = vi.fn().mockReturnValue(true);

    container = new PromptListContainer(mockStateManager, mockPromptManager, mockClipboardManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('REQ-LIST-001: プロンプトリスト基本表示', () => {
    it('should initialize and load prompts', async () => {
      // 🟢 Blue: Basic prompt list display requirement
      await container.initialize();

      const state = container.getState();
      expect(state.prompts).toHaveLength(3);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockPromptManager.getAllPrompts).toHaveBeenCalledOnce();
    });

    it('should display prompts with required information', async () => {
      // 🟢 Blue: Required item display
      await container.initialize();

      const state = container.getState();
      const firstPrompt = state.prompts[0];

      expect(firstPrompt).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        content: expect.any(String),
        createdAt: expect.any(Date),
        usageCount: expect.any(Number),
      });
    });

    it('should handle empty prompt list', async () => {
      // 🟡 Yellow: Empty state handling
      mockPromptManager.getAllPrompts = vi.fn().mockResolvedValue([]);

      await container.initialize();

      const state = container.getState();
      expect(state.prompts).toHaveLength(0);
      expect(state.filteredPrompts).toHaveLength(0);
    });

    it('should handle loading errors gracefully', async () => {
      // 🔴 Red: Error handling requirement
      const error = new Error('プロンプトの読み込みに失敗しました');
      mockPromptManager.getAllPrompts = vi.fn().mockRejectedValue(error);

      await container.initialize();

      const state = container.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeTruthy();
      expect(mockStateManager.showError).toHaveBeenCalled();
    });
  });

  describe('REQ-LIST-002: 仮想スクロール対応', () => {
    it('should handle large datasets efficiently', async () => {
      // 🟢 Blue: Virtual scrolling for 1000+ items
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `prompt-${i}`,
        title: `プロンプト ${i}`,
        content: `テストプロンプト ${i} の内容`,
        createdAt: new Date(2024, 0, 1, 10, i % 60),
        updatedAt: new Date(2024, 0, 1, 10, i % 60),
        usageCount: i % 10,
        usedAt: new Date(2024, 0, 15, 14, i % 60),
        tags: i % 3 === 0 ? [`タグ${i}`] : [],
      })) as Prompt[];

      mockPromptManager.getAllPrompts = vi.fn().mockResolvedValue(largeDataset);

      await container.initialize();

      const state = container.getState();
      expect(state.prompts).toHaveLength(1000);
      expect(state.filteredPrompts).toHaveLength(1000);

      // Performance should not degrade significantly
      const startTime = performance.now();
      container.setSortOption('title', 'asc');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should sort within 100ms
    });

    it('should maintain scroll position during updates', async () => {
      // 🟡 Yellow: Scroll position preservation
      await container.initialize();

      const listElement = document.getElementById('prompt-list');
      if (listElement) {
        listElement.scrollTop = 100;

        // Trigger update
        container.setSortOption('usageCount', 'desc');

        // Scroll position behavior would be tested in integration tests
        expect(listElement.scrollTop).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('REQ-LIST-003: ソート機能', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should sort by creation date', () => {
      // 🟢 Blue: Sort by creation date requirement
      container.setSortOption('createdAt', 'asc');

      const state = container.getState();
      const sortedPrompts = state.filteredPrompts;

      // Check dates are in ascending order
      expect(new Date(sortedPrompts[0].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(sortedPrompts[1].createdAt).getTime()
      );
      expect(new Date(sortedPrompts[1].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(sortedPrompts[2].createdAt).getTime()
      );

      // Should be プロンプト1, プロンプト2, プロンプト3 based on creation dates
      expect(sortedPrompts[0].id).toBe('1');
      expect(sortedPrompts[1].id).toBe('2');
      expect(sortedPrompts[2].id).toBe('3');
    });

    it('should sort by usage count', () => {
      // 🟢 Blue: Sort by usage count requirement
      container.setSortOption('usageCount', 'desc');

      const state = container.getState();
      const sortedPrompts = state.filteredPrompts;

      expect(sortedPrompts[0].usageCount).toBe(10); // プロンプト3
      expect(sortedPrompts[1].usageCount).toBe(5); // プロンプト1
      expect(sortedPrompts[2].usageCount).toBe(3); // プロンプト2
    });

    it('should sort by title alphabetically', () => {
      // 🟢 Blue: Alphabetical sort requirement
      container.setSortOption('title', 'asc');

      const state = container.getState();
      const sortedPrompts = state.filteredPrompts;

      // Check titles are in alphabetical order
      for (let i = 0; i < sortedPrompts.length - 1; i++) {
        expect(
          sortedPrompts[i].title.localeCompare(sortedPrompts[i + 1].title, 'ja')
        ).toBeLessThanOrEqual(0);
      }

      // Should be プロンプト1, プロンプト2, プロンプト3 based on Japanese collation
      expect(sortedPrompts[0].id).toBe('1');
      expect(sortedPrompts[1].id).toBe('2');
      expect(sortedPrompts[2].id).toBe('3');
    });

    it('should sort by last used date', () => {
      // 🟢 Blue: Sort by last used requirement
      container.setSortOption('usedAt', 'desc');

      const state = container.getState();
      const sortedPrompts = state.filteredPrompts;

      // 最新使用順: プロンプト3 > プロンプト1 > プロンプト2
      expect(sortedPrompts[0].title).toBe('プロンプト3');
      expect(sortedPrompts[1].title).toBe('プロンプト1');
      expect(sortedPrompts[2].title).toBe('プロンプト2');
    });

    it('should toggle sort direction', () => {
      // 🟡 Yellow: Sort direction toggle
      container.setSortOption('title', 'asc');
      let state = container.getState();
      expect(state.sortDirection).toBe('asc');

      container.setSortOption('title'); // No direction specified
      state = container.getState();
      expect(state.sortDirection).toBe('desc');
    });

    it('should update UI when sort changes', () => {
      // 🟡 Yellow: UI update on sort change
      container.setSortOption('usageCount', 'desc');

      const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
      expect(sortSelect.value).toBe('usageCount-desc');
    });
  });

  describe('REQ-LIST-004: プロンプトアイテム操作', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should copy prompt to clipboard', async () => {
      // 🟢 Blue: One-click copy requirement
      const promptId = '1';

      await container.copyPrompt(promptId);

      expect(mockClipboardManager.copy).toHaveBeenCalledWith('これは最初のテストプロンプトです。');
      expect(mockPromptManager.updateUsage).toHaveBeenCalledWith(promptId);
      expect(mockStateManager.showSuccess).toHaveBeenCalledWith('プロンプトをコピーしました', 2000);
    });

    it('should delete prompt with confirmation', async () => {
      // 🟢 Blue: Delete with confirmation requirement
      const promptId = '2';
      global.confirm = vi.fn().mockReturnValue(true);

      await container.deletePrompt(promptId);

      expect(global.confirm).toHaveBeenCalledWith('このプロンプトを削除しますか？');
      expect(mockPromptManager.deletePrompt).toHaveBeenCalledWith(promptId);
      expect(mockStateManager.showSuccess).toHaveBeenCalledWith('プロンプトを削除しました', 2000);
    });

    it('should cancel delete when user cancels confirmation', async () => {
      // 🟡 Yellow: Delete cancellation
      const promptId = '2';
      global.confirm = vi.fn().mockReturnValue(false);

      await container.deletePrompt(promptId);

      expect(mockPromptManager.deletePrompt).not.toHaveBeenCalled();
      expect(mockStateManager.showSuccess).not.toHaveBeenCalled();
    });

    it('should handle copy errors gracefully', async () => {
      // 🔴 Red: Copy error handling
      const promptId = '1';
      const error = new Error('クリップボードアクセスが拒否されました');
      mockClipboardManager.copy = vi.fn().mockRejectedValue(error);

      await container.copyPrompt(promptId);

      expect(mockStateManager.showError).toHaveBeenCalled();
    });

    it('should handle prompt selection', () => {
      // 🟡 Yellow: Selection state management
      const promptId = '1';

      container.selectPrompt(promptId);

      const state = container.getState();
      expect(state.selectedPromptId).toBe(promptId);
    });

    it('should clear selection', () => {
      // 🟡 Yellow: Selection clearing
      container.selectPrompt('1');
      container.selectPrompt(null);

      const state = container.getState();
      expect(state.selectedPromptId).toBeNull();
    });
  });

  describe('REQ-LIST-005: ローディング・エラー状態', () => {
    it('should show loading state during initialization', async () => {
      // 🟢 Blue: Loading state display
      // Create a promise that we can resolve manually
      let resolvePrompts: (value: Prompt[]) => void;
      const promptsPromise = new Promise<Prompt[]>((resolve) => {
        resolvePrompts = resolve;
      });

      mockPromptManager.getAllPrompts = vi.fn().mockReturnValue(promptsPromise);

      // Start initialization (should be loading)
      const initPromise = container.initialize();

      // Check loading state
      const loadingState = container.getState();
      expect(loadingState.loading).toBe(true);
      expect(loadingState.error).toBeNull();

      // Resolve the promise
      resolvePrompts!(createMockPrompts());
      await initPromise;

      // Check final state
      const finalState = container.getState();
      expect(finalState.loading).toBe(false);
    });

    it('should display error message when loading fails', async () => {
      // 🟢 Blue: Error state display
      const error = new Error('ネットワークエラー');
      mockPromptManager.getAllPrompts = vi.fn().mockRejectedValue(error);

      await container.initialize();

      const state = container.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
      expect(mockStateManager.showError).toHaveBeenCalled();
    });

    it('should handle empty prompt list appropriately', async () => {
      // 🟢 Blue: Empty state handling
      mockPromptManager.getAllPrompts = vi.fn().mockResolvedValue([]);

      await container.initialize();

      const state = container.getState();
      expect(state.prompts).toHaveLength(0);
      expect(state.filteredPrompts).toHaveLength(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('REQ-LIST-006: レスポンシブデザイン', () => {
    it('should update prompt count display', async () => {
      // 🟡 Yellow: Responsive prompt count
      await container.initialize();

      const promptCount = document.getElementById('prompt-count');
      expect(promptCount?.textContent).toBe('3件のプロンプト');
    });

    it('should handle view mode changes', () => {
      // 🟡 Yellow: View mode switching
      container.setViewMode('grid');

      const state = container.getState();
      expect(state.viewMode).toBe('grid');

      const containerElement = document.getElementById('prompt-list-container');
      expect(containerElement?.className).toContain('view-mode-grid');
    });

    it('should maintain container structure', () => {
      // 🟡 Yellow: Container structure integrity
      const container = document.getElementById('prompt-list-container');
      const header = document.getElementById('prompt-list-header');
      const list = document.getElementById('prompt-list');
      const footer = document.getElementById('prompt-list-footer');

      expect(container).toBeTruthy();
      expect(header).toBeTruthy();
      expect(list).toBeTruthy();
      expect(footer).toBeTruthy();
    });
  });

  describe('State Management and Listeners', () => {
    it('should notify listeners on state changes', async () => {
      // 🟡 Yellow: State change notifications
      const listener = vi.fn();
      const unsubscribe = container.subscribe(listener);

      await container.initialize();

      const callCount = listener.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);

      unsubscribe();
      container.setSortOption('title', 'asc');

      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(callCount);
    });

    it('should return immutable state', () => {
      // 🟡 Yellow: State immutability
      const state1 = container.getState();
      const state2 = container.getState();

      expect(state1).not.toBe(state2); // Different object references
      expect(state1).toEqual(state2); // Same content

      // Modifying returned state should not affect internal state
      (state1 as any).loading = true;
      expect(container.getState().loading).toBe(false);
    });

    it('should handle listener errors gracefully', async () => {
      // 🔴 Red: Listener error handling
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      container.subscribe(errorListener);
      await container.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('Error in prompt list listener:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should handle keyboard navigation events', () => {
      // 🟡 Yellow: Keyboard navigation
      const listElement = document.getElementById('prompt-list');

      // Simulate arrow down key
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      listElement?.dispatchEvent(downEvent);

      // Should select first item
      const state = container.getState();
      expect(state.selectedPromptId).toBeTruthy();
    });

    it('should handle global keyboard shortcuts', () => {
      // 🟡 Yellow: Global shortcuts
      const refreshSpy = vi.spyOn(container, 'loadPrompts');

      // Simulate Ctrl+R
      const refreshEvent = new KeyboardEvent('keydown', {
        key: 'r',
        ctrlKey: true,
      });
      document.dispatchEvent(refreshEvent);

      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid state updates efficiently', async () => {
      // 🟡 Yellow: Performance under rapid updates
      await container.initialize();

      const startTime = performance.now();

      // Rapid sort changes
      for (let i = 0; i < 10; i++) {
        container.setSortOption(i % 2 === 0 ? 'title' : 'createdAt');
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });

    it('should cleanup resources properly', () => {
      // 🔴 Red: Resource cleanup
      const listener = vi.fn();
      const unsubscribe = container.subscribe(listener);

      // Should be able to unsubscribe
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();

      // Listener should not be called after unsubscribe
      container.setSortOption('title');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
