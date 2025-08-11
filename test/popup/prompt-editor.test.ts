// PromptEditor Test Suite
// TASK-0013: プロンプト作成・編集機能 Tests

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PromptEditor, type EditorMode } from '../../src/popup/prompt-editor';
import { PopupStateManager } from '../../src/popup/popup-state-manager';
import { PromptManager } from '../../src/core/prompt-manager';
import type { Prompt } from '../../src/types';

// Mock dependencies
vi.mock('../../src/popup/popup-state-manager');
vi.mock('../../src/core/prompt-manager');
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
const createMockPrompt = (): Prompt => ({
  id: 'test-prompt-1',
  title: 'テストプロンプト',
  content: 'これはテスト用のプロンプト内容です。',
  tags: ['テスト', '開発'],
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  usageCount: 0,
});

// Mock DOM elements
const setupMockDOM = (): void => {
  document.body.innerHTML = `
    <div id="prompt-editor-overlay" class="editor-overlay" hidden>
      <div id="prompt-editor-modal" class="editor-modal">
        <header class="editor-header">
          <h2 id="editor-modal-title" class="editor-title">
            <span class="editor-title-text">新しいプロンプト作成</span>
          </h2>
          <button class="editor-close" type="button"></button>
        </header>
        
        <div class="editor-content">
          <div id="prompt-editor-errors" class="editor-errors" hidden></div>
          
          <form id="prompt-editor-form" class="editor-form">
            <div class="field-container">
              <input id="prompt-title-field" class="field-input" type="text" maxlength="100" required />
              <div id="title-counter" class="character-counter">0/100</div>
              <div class="field-error" aria-hidden="true"></div>
            </div>
            
            <div class="field-container">
              <textarea id="prompt-content-field" class="field-textarea" maxlength="10000" required></textarea>
              <div id="content-counter" class="character-counter">0/10,000</div>
              <div class="field-error" aria-hidden="true"></div>
            </div>
            
            <div class="field-container">
              <input id="prompt-tags-field" class="field-input" type="text" />
              <div class="field-error" aria-hidden="true"></div>
            </div>
          </form>
        </div>
        
        <footer class="editor-footer">
          <div class="editor-actions">
            <button id="prompt-cancel-btn" type="button" class="secondary-button">キャンセル</button>
            <button id="prompt-save-btn" type="submit" class="primary-button" disabled>保存</button>
          </div>
        </footer>
      </div>
    </div>
  `;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('PromptEditor', () => {
  let editor: PromptEditor;
  let mockStateManager: PopupStateManager;
  let mockPromptManager: PromptManager;

  beforeEach(() => {
    setupMockDOM();
    localStorageMock.clear();

    // Create mock instances
    mockStateManager = new PopupStateManager() as any;
    mockPromptManager = new PromptManager({} as any) as any;

    // Mock methods
    mockStateManager.showSuccess = vi.fn();
    mockStateManager.showError = vi.fn();
    mockPromptManager.createPrompt = vi.fn().mockResolvedValue(createMockPrompt());
    mockPromptManager.updatePrompt = vi.fn().mockResolvedValue(createMockPrompt());
    mockPromptManager.getPrompt = vi.fn().mockResolvedValue(createMockPrompt());

    // Mock window.confirm
    global.confirm = vi.fn().mockReturnValue(true);

    editor = new PromptEditor(mockStateManager, mockPromptManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    localStorageMock.clear();
  });

  describe('REQ-EDITOR-001: プロンプト作成フォーム', () => {
    it('should initialize and show create mode', () => {
      // 🟢 Blue: Basic form display requirement
      editor.show('create');

      const state = editor.getState();
      expect(state.mode).toBe('create');
      expect(state.isVisible).toBe(true);
      expect(state.prompt).toEqual({});

      const modal = document.getElementById('prompt-editor-modal');
      expect(modal?.hidden).toBe(false);
    });

    it('should show required and optional fields', () => {
      // 🟢 Blue: Field structure requirement
      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;
      const tagsField = document.getElementById('prompt-tags-field') as HTMLInputElement;

      expect(titleField).toBeTruthy();
      expect(contentField).toBeTruthy();
      expect(tagsField).toBeTruthy();

      expect(titleField.required).toBe(true);
      expect(contentField.required).toBe(true);
      expect(tagsField.required).toBe(false);
    });

    it('should handle modal close', () => {
      // 🟡 Yellow: Modal interaction
      editor.show('create');
      editor.hide();

      const state = editor.getState();
      expect(state.isVisible).toBe(false);

      const modal = document.getElementById('prompt-editor-modal');
      expect(modal?.hidden).toBe(true);
    });
  });

  describe('REQ-EDITOR-002: リアルタイムバリデーション', () => {
    beforeEach(() => {
      editor.show('create');
    });

    it('should validate title field', async () => {
      // 🟢 Blue: Title validation requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;

      // Test empty title
      titleField.value = '';
      titleField.dispatchEvent(new Event('input'));

      // Wait for debounced validation
      await new Promise((resolve) => setTimeout(resolve, 350));

      const state = editor.getState();
      expect(state.validation.title.valid).toBe(false);
      expect(state.validation.title.message).toBe('タイトルは必須です');
    });

    it('should validate content field', async () => {
      // 🟢 Blue: Content validation requirement
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      // Test empty content
      contentField.value = '';
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const state = editor.getState();
      expect(state.validation.content.valid).toBe(false);
      expect(state.validation.content.message).toBe('本文は必須です');
    });

    it('should validate field lengths', async () => {
      // 🟢 Blue: Length validation requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      // Test title too long
      titleField.value = 'a'.repeat(101);
      titleField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      let state = editor.getState();
      expect(state.validation.title.valid).toBe(false);
      expect(state.validation.title.message).toBe('タイトルは100文字以内で入力してください');

      // Test content too long
      contentField.value = 'a'.repeat(10001);
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      state = editor.getState();
      expect(state.validation.content.valid).toBe(false);
      expect(state.validation.content.message).toBe('本文は10,000文字以内で入力してください');
    });

    it('should validate with debouncing', async () => {
      // 🟡 Yellow: Debouncing performance requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;

      // Rapid input changes
      titleField.value = 'a';
      titleField.dispatchEvent(new Event('input'));

      titleField.value = 'ab';
      titleField.dispatchEvent(new Event('input'));

      titleField.value = 'abc';
      titleField.dispatchEvent(new Event('input'));

      // Should not validate immediately
      let state = editor.getState();
      expect(state.validation.title.valid).toBe(false);
      expect(state.validation.title.message).toBe('');

      // Should validate after debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      state = editor.getState();
      expect(state.validation.title.valid).toBe(true);
    });

    it('should update save button state based on validation', async () => {
      // 🟡 Yellow: Save button state management
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;
      const saveButton = document.getElementById('prompt-save-btn') as HTMLButtonElement;

      expect(saveButton.disabled).toBe(true);

      // Fill valid data
      titleField.value = 'Valid Title';
      titleField.dispatchEvent(new Event('input'));

      contentField.value = 'Valid content';
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(saveButton.disabled).toBe(false);
    });
  });

  describe('REQ-EDITOR-003: 文字数カウンター機能', () => {
    beforeEach(() => {
      editor.show('create');
    });

    it('should update character counters', () => {
      // 🟢 Blue: Character counter display requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;
      const titleCounter = document.getElementById('title-counter');
      const contentCounter = document.getElementById('content-counter');

      titleField.value = 'Test Title';
      titleField.dispatchEvent(new Event('input'));

      contentField.value = 'Test content';
      contentField.dispatchEvent(new Event('input'));

      expect(titleCounter?.textContent).toBe('10/100');
      expect(contentCounter?.textContent).toBe('12/10,000');
    });

    it('should show warning at 90% capacity', () => {
      // 🟡 Yellow: Warning threshold requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const titleCounter = document.getElementById('title-counter');

      titleField.value = 'a'.repeat(90); // 90% of 100
      titleField.dispatchEvent(new Event('input'));

      expect(titleCounter?.className).toContain('counter-warning');
    });

    it('should show error at 100% capacity', () => {
      // 🟡 Yellow: Error threshold requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const titleCounter = document.getElementById('title-counter');

      titleField.value = 'a'.repeat(100); // 100% of 100
      titleField.dispatchEvent(new Event('input'));

      expect(titleCounter?.className).toContain('counter-error');
    });
  });

  describe('REQ-EDITOR-004: 自動保存・下書き機能', () => {
    beforeEach(() => {
      editor.show('create');
    });

    it('should schedule auto-save after field changes', async () => {
      // 🟢 Blue: Auto-save scheduling requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Auto-save test';
      contentField.value = 'Auto-save content';
      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      // Wait for auto-save delay (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5100));

      expect(localStorageMock.setItem).toHaveBeenCalled();
    }, 10000);

    it('should restore from auto-save', () => {
      // 🟡 Yellow: Auto-save restoration requirement
      const autoSaveData = {
        data: {
          title: 'Restored Title',
          content: 'Restored Content',
          tags: ['restored'],
        },
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorageMock.setItem('prompt_editor_draft', JSON.stringify(autoSaveData));
      global.confirm = vi.fn().mockReturnValue(true);

      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      expect(titleField.value).toBe('Restored Title');
      expect(contentField.value).toBe('Restored Content');
    });

    it('should clear auto-save on successful save', async () => {
      // 🟡 Yellow: Auto-save cleanup requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const saved = await editor.save();
      expect(saved).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('prompt_editor_draft');
    });

    it('should ignore old auto-save data', () => {
      // 🔴 Red: Auto-save expiry requirement
      const oldAutoSaveData = {
        data: { title: 'Old Title' },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        version: '1.0',
      };

      localStorageMock.setItem('prompt_editor_draft', JSON.stringify(oldAutoSaveData));

      editor.show('create');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('prompt_editor_draft');
    });
  });

  describe('REQ-EDITOR-005: 編集モード対応', () => {
    it('should load prompt data in edit mode', async () => {
      // 🟢 Blue: Edit mode data loading requirement
      const mockPrompt = createMockPrompt();
      mockPromptManager.getPrompt = vi.fn().mockResolvedValue(mockPrompt);

      editor.show('edit', 'test-prompt-1');

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = editor.getState();
      expect(state.mode).toBe('edit');
      expect(state.prompt).toEqual(mockPrompt);

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      expect(titleField.value).toBe(mockPrompt.title);
      expect(contentField.value).toBe(mockPrompt.content);
    });

    it('should update existing prompt on save', async () => {
      // 🟢 Blue: Edit mode save requirement
      const mockPrompt = createMockPrompt();
      mockPromptManager.getPrompt = vi.fn().mockResolvedValue(mockPrompt);

      editor.show('edit', 'test-prompt-1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Updated Title';
      contentField.value = 'Updated Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const saved = await editor.save();
      expect(saved).toBe(true);
      expect(mockPromptManager.updatePrompt).toHaveBeenCalledWith(
        'test-prompt-1',
        expect.objectContaining({
          title: 'Updated Title',
          content: 'Updated Content',
        })
      );
    });

    it('should handle edit mode errors gracefully', async () => {
      // 🔴 Red: Error handling in edit mode
      mockPromptManager.getPrompt = vi.fn().mockRejectedValue(new Error('Prompt not found'));

      editor.show('edit', 'non-existent-id');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockStateManager.showError).toHaveBeenCalled();
    });
  });

  describe('REQ-EDITOR-006: キーボードショートカット', () => {
    beforeEach(() => {
      editor.show('create');
    });

    it('should handle Ctrl+S for save', async () => {
      // 🟢 Blue: Save shortcut requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const saveEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
      });
      document.dispatchEvent(saveEvent);

      // Wait for save to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPromptManager.createPrompt).toHaveBeenCalled();
    });

    it('should handle Escape for cancel', () => {
      // 🟡 Yellow: Cancel shortcut requirement
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      const state = editor.getState();
      expect(state.isVisible).toBe(false);
    });

    it('should handle Ctrl+Enter for save and close', async () => {
      // 🟡 Yellow: Save and close shortcut requirement
      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const saveCloseEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
      });
      document.dispatchEvent(saveCloseEvent);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPromptManager.createPrompt).toHaveBeenCalled();

      const state = editor.getState();
      expect(state.isVisible).toBe(false);
    });
  });

  describe('REQ-EDITOR-007: UI/UX最適化', () => {
    it('should focus title field on modal open', async () => {
      // 🟡 Yellow: Auto-focus requirement
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');

      editor.show('create');

      // Wait for focus timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(focusSpy).toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('should show success feedback on save', async () => {
      // 🟡 Yellow: Success feedback requirement
      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      await editor.save();

      expect(mockStateManager.showSuccess).toHaveBeenCalledWith('プロンプトを作成しました', 2000);
    });

    it('should emit save events', async () => {
      // 🟡 Yellow: Event emission requirement
      const eventListener = vi.fn();
      window.addEventListener('prompt:saved', eventListener);

      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      await editor.save();

      expect(eventListener).toHaveBeenCalled();

      window.removeEventListener('prompt:saved', eventListener);
    });

    it('should handle dirty state confirmation', () => {
      // 🟡 Yellow: Dirty state handling
      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      titleField.value = 'Unsaved changes';
      titleField.dispatchEvent(new Event('input'));

      global.confirm = vi.fn().mockReturnValue(false);

      editor.hide();

      expect(global.confirm).toHaveBeenCalledWith(
        '変更が保存されていません。閉じてもよろしいですか？'
      );

      // Should remain visible if user cancels
      const state = editor.getState();
      expect(state.isVisible).toBe(true);
    });
  });

  describe('State Management and Listeners', () => {
    it('should notify listeners on state changes', () => {
      // 🟡 Yellow: State change notifications
      const listener = vi.fn();
      const unsubscribe = editor.subscribe(listener);

      editor.show('create');

      expect(listener).toHaveBeenCalled();

      unsubscribe();
      editor.hide();

      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return immutable state', () => {
      // 🟡 Yellow: State immutability
      const state1 = editor.getState();
      const state2 = editor.getState();

      expect(state1).not.toBe(state2); // Different object references
      expect(state1).toEqual(state2); // Same content

      // Modifying returned state should not affect internal state
      (state1 as any).isVisible = true;
      expect(editor.getState().isVisible).toBe(false);
    });

    it('should handle listener errors gracefully', () => {
      // 🔴 Red: Listener error handling
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      editor.subscribe(errorListener);
      editor.show('create');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in prompt editor listener:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      // 🔴 Red: Save error handling
      mockPromptManager.createPrompt = vi.fn().mockRejectedValue(new Error('Save failed'));

      editor.show('create');

      const titleField = document.getElementById('prompt-title-field') as HTMLInputElement;
      const contentField = document.getElementById('prompt-content-field') as HTMLTextAreaElement;

      titleField.value = 'Test Title';
      contentField.value = 'Test Content';

      titleField.dispatchEvent(new Event('input'));
      contentField.dispatchEvent(new Event('input'));

      await new Promise((resolve) => setTimeout(resolve, 350));

      const saved = await editor.save();
      expect(saved).toBe(false);
      expect(mockStateManager.showError).toHaveBeenCalled();
    });

    it('should handle missing DOM elements gracefully', () => {
      // 🔴 Red: DOM element validation
      document.body.innerHTML = '';

      expect(() => {
        new PromptEditor(mockStateManager, mockPromptManager);
      }).toThrow('Required element not found');
    });

    it('should handle tags parsing', () => {
      // 🟡 Yellow: Tags input handling
      editor.show('create');

      const tagsField = document.getElementById('prompt-tags-field') as HTMLInputElement;

      // Test space and comma separation
      tagsField.value = 'tag1, tag2   tag3,tag4';
      tagsField.dispatchEvent(new Event('input'));

      const state = editor.getState();
      expect(state.prompt.tags).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
    });

    it('should limit tags to 10 items', () => {
      // 🟡 Yellow: Tags limit enforcement
      editor.show('create');

      const tagsField = document.getElementById('prompt-tags-field') as HTMLInputElement;

      // Test more than 10 tags
      const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i + 1}`).join(', ');
      tagsField.value = manyTags;
      tagsField.dispatchEvent(new Event('input'));

      const state = editor.getState();
      expect(state.prompt.tags?.length).toBe(10);
    });
  });
});
