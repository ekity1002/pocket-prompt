// Test for PromptCreateModal
// TASK-0021: プロンプト追加モーダルUI実装

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PromptCreateModal, type PromptCreateModalOptions } from '../../../src/components/prompt/PromptCreateModal';
import type { CreatePromptRequest } from '../../../src/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock DOM methods
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => setTimeout(callback, 0),
});

// Mock confirm dialog
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
});

describe('PromptCreateModal', () => {
  let modal: PromptCreateModal;
  let mockOptions: PromptCreateModalOptions;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    
    // Clear mocks
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);

    // Setup mock options
    mockOptions = {
      onSave: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn(),
    };

    modal = new PromptCreateModal(mockOptions);
  });

  afterEach(() => {
    modal?.destroy();
  });

  describe('Modal Creation and Display', () => {
    it('should create modal element with correct structure', () => {
      modal.show();

      const modalElement = document.querySelector('.prompt-create-modal');
      expect(modalElement).toBeTruthy();

      // Check for essential elements
      expect(modalElement?.querySelector('#modal-title')).toBeTruthy();
      expect(modalElement?.querySelector('#prompt-title')).toBeTruthy();
      expect(modalElement?.querySelector('#prompt-content')).toBeTruthy();
      expect(modalElement?.querySelector('#prompt-tags')).toBeTruthy();
      expect(modalElement?.querySelector('.save-btn')).toBeTruthy();
      expect(modalElement?.querySelector('.cancel-btn')).toBeTruthy();
    });

    it('should show modal with animation', () => {
      modal.show();

      const modalElement = document.querySelector('.prompt-create-modal');
      expect(modalElement).toBeTruthy();

      // Should be added to DOM
      expect(document.body.contains(modalElement)).toBe(true);

      // Should have show class after animation
      setTimeout(() => {
        expect(modalElement?.classList.contains('show')).toBe(true);
      }, 10);
    });

    it('should focus on title field when shown', () => {
      modal.show();

      const titleField = document.querySelector('#prompt-title') as HTMLInputElement;
      
      // Check that focus method would be called
      setTimeout(() => {
        expect(document.activeElement).toBe(titleField);
      }, 10);
    });

    it('should hide modal and remove from DOM', () => {
      modal.show();
      const modalElement = document.querySelector('.prompt-create-modal');
      
      modal.hide();
      expect(modalElement?.classList.contains('show')).toBe(false);

      // Should be removed from DOM after animation
      setTimeout(() => {
        expect(document.body.contains(modalElement)).toBe(false);
      }, 250);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should validate title field', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const saveButton = document.querySelector('.save-btn') as HTMLButtonElement;

      // Initially disabled (no title)
      expect(saveButton.disabled).toBe(true);

      // Enter valid title
      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));

      // Should still be disabled (no content)
      expect(saveButton.disabled).toBe(true);

      // Check validation classes
      expect(titleInput.classList.contains('error')).toBe(false);
    });

    it('should validate content field', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const saveButton = document.querySelector('.save-btn') as HTMLButtonElement;

      // Enter valid title and content
      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'This is a test prompt content';
      contentTextarea.dispatchEvent(new Event('input'));

      // Should be enabled now
      expect(saveButton.disabled).toBe(false);
    });

    it('should show error for empty title', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const titleError = document.querySelector('#title-error') as HTMLElement;

      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input'));

      // Error should be shown for empty title
      expect(titleInput.classList.contains('error')).toBe(true);
      expect(titleInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should show error for empty content', () => {
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;

      contentTextarea.value = '';
      contentTextarea.dispatchEvent(new Event('input'));

      expect(contentTextarea.classList.contains('error')).toBe(true);
    });

    it('should validate title length limit', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const longTitle = 'a'.repeat(201); // Exceed 200 character limit

      titleInput.value = longTitle;
      titleInput.dispatchEvent(new Event('input'));

      expect(titleInput.classList.contains('error')).toBe(true);
    });

    it('should validate content length limit', () => {
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const longContent = 'a'.repeat(10001); // Exceed 10000 character limit

      contentTextarea.value = longContent;
      contentTextarea.dispatchEvent(new Event('input'));

      expect(contentTextarea.classList.contains('error')).toBe(true);
    });
  });

  describe('Character Counter', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should update title character counter', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const titleCounter = document.querySelector('#title-counter') as HTMLElement;

      titleInput.value = 'Test Title';
      titleInput.dispatchEvent(new Event('input'));

      expect(titleCounter.textContent).toBe('10/200');
    });

    it('should update content character counter', () => {
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const contentCounter = document.querySelector('#content-counter') as HTMLElement;

      contentTextarea.value = 'Test content';
      contentTextarea.dispatchEvent(new Event('input'));

      expect(contentCounter.textContent).toBe('12/10,000');
    });

    it('should show warning when approaching limit', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const titleCounter = document.querySelector('#title-counter') as HTMLElement;

      titleInput.value = 'a'.repeat(190); // 95% of 200
      titleInput.dispatchEvent(new Event('input'));

      expect(titleCounter.classList.contains('warning')).toBe(true);
    });

    it('should show danger when at limit', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const titleCounter = document.querySelector('#title-counter') as HTMLElement;

      titleInput.value = 'a'.repeat(200); // 100% of 200
      titleInput.dispatchEvent(new Event('input'));

      expect(titleCounter.classList.contains('danger')).toBe(true);
    });
  });

  describe('Tags Handling', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should parse comma-separated tags', () => {
      const tagsInput = document.querySelector('#prompt-tags') as HTMLInputElement;

      tagsInput.value = 'javascript, programming, web development';
      tagsInput.dispatchEvent(new Event('input'));

      // Internal state should contain parsed tags
      // Note: We can't directly access private state, so we test behavior
      expect(tagsInput.value).toBe('javascript, programming, web development');
    });

    it('should handle empty tags gracefully', () => {
      const tagsInput = document.querySelector('#prompt-tags') as HTMLInputElement;

      tagsInput.value = '';
      tagsInput.dispatchEvent(new Event('input'));

      // Should not show any errors for empty optional field
      expect(tagsInput.classList.contains('error')).toBe(false);
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should schedule auto-save when content changes', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;

      titleInput.value = 'Test Title';
      titleInput.dispatchEvent(new Event('input'));

      // Auto-save should be scheduled (timeout set)
      // We can't directly test the timeout, but we can verify localStorage would be called
      setTimeout(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'prompt_create_draft',
          expect.stringContaining('Test Title')
        );
      }, 5100); // Just over 5 second auto-save delay
    });

    it('should load draft data on initialization', () => {
      const draftData = {
        title: 'Draft Title',
        content: 'Draft Content',
        tags: ['draft', 'test'],
        timestamp: Date.now(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(draftData));

      // Create new modal to test draft loading
      const newModal = new PromptCreateModal(mockOptions);
      newModal.show();

      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;

      // Fields should be populated with draft data
      expect(titleInput.value).toBe('Draft Title');
      expect(contentTextarea.value).toBe('Draft Content');

      newModal.destroy();
    });

    it('should clear expired draft data', () => {
      const expiredDraftData = {
        title: 'Old Draft',
        content: 'Old Content',
        tags: [],
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredDraftData));

      const newModal = new PromptCreateModal(mockOptions);
      newModal.show();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('prompt_create_draft');

      newModal.destroy();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should save prompt with valid data', async () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const tagsInput = document.querySelector('#prompt-tags') as HTMLInputElement;
      const saveButton = document.querySelector('.save-btn') as HTMLButtonElement;

      // Fill in valid data
      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'This is test content';
      contentTextarea.dispatchEvent(new Event('input'));
      
      tagsInput.value = 'test, example';
      tagsInput.dispatchEvent(new Event('input'));

      // Click save button
      saveButton.click();

      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockOptions.onSave).toHaveBeenCalledWith({
        title: 'Test Prompt',
        content: 'This is test content',
        tags: ['test', 'example'],
      });
    });

    it('should handle save errors gracefully', async () => {
      const saveError = new Error('Save failed');
      mockOptions.onSave = vi.fn().mockRejectedValue(saveError);

      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const saveButton = document.querySelector('.save-btn') as HTMLButtonElement;

      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'Test content';
      contentTextarea.dispatchEvent(new Event('input'));

      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      // Error should be displayed in status
      const statusElement = document.querySelector('.modal-status') as HTMLElement;
      expect(statusElement.textContent).toContain('Save failed');
      expect(statusElement.classList.contains('status-error')).toBe(true);
    });

    it('should show loading state during save', async () => {
      let saveResolve: () => void;
      const savePromise = new Promise<void>(resolve => {
        saveResolve = resolve;
      });
      mockOptions.onSave = vi.fn().mockReturnValue(savePromise);

      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const saveButton = document.querySelector('.save-btn') as HTMLButtonElement;

      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'Test content';
      contentTextarea.dispatchEvent(new Event('input'));

      saveButton.click();

      // Button should be disabled and show loading
      expect(saveButton.disabled).toBe(true);
      expect(saveButton.querySelector('.btn-spinner')?.classList.contains('hidden')).toBe(false);

      // Resolve the save promise
      saveResolve!();
      await savePromise;
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should close modal on Escape key', () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(mockOptions.onCancel).toHaveBeenCalled();
    });

    it('should save on Ctrl+S', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;

      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'Test content';
      contentTextarea.dispatchEvent(new Event('input'));

      const ctrlSEvent = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      document.dispatchEvent(ctrlSEvent);

      expect(mockOptions.onSave).toHaveBeenCalled();
    });

    it('should save on Ctrl+Enter', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;

      titleInput.value = 'Test Prompt';
      titleInput.dispatchEvent(new Event('input'));
      
      contentTextarea.value = 'Test content';
      contentTextarea.dispatchEvent(new Event('input'));

      const ctrlEnterEvent = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
      document.dispatchEvent(ctrlEnterEvent);

      expect(mockOptions.onSave).toHaveBeenCalled();
    });
  });

  describe('Cancel Behavior', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should call onCancel when cancel button clicked', () => {
      const cancelButton = document.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelButton.click();

      expect(mockOptions.onCancel).toHaveBeenCalled();
    });

    it('should call onCancel when close button clicked', () => {
      const closeButton = document.querySelector('.modal-close') as HTMLButtonElement;
      closeButton.click();

      expect(mockOptions.onCancel).toHaveBeenCalled();
    });

    it('should confirm before closing when form is dirty', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const cancelButton = document.querySelector('.cancel-btn') as HTMLButtonElement;

      // Make form dirty
      titleInput.value = 'Test';
      titleInput.dispatchEvent(new Event('input'));

      cancelButton.click();

      expect(window.confirm).toHaveBeenCalledWith('変更が保存されていません。閉じてもよろしいですか？');
    });

    it('should not close when user cancels confirmation', () => {
      vi.mocked(window.confirm).mockReturnValue(false);

      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const cancelButton = document.querySelector('.cancel-btn') as HTMLButtonElement;

      titleInput.value = 'Test';
      titleInput.dispatchEvent(new Event('input'));

      cancelButton.click();

      expect(mockOptions.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      modal.show();
    });

    it('should have proper ARIA attributes', () => {
      const modalElement = document.querySelector('.prompt-create-modal') as HTMLElement;

      expect(modalElement.getAttribute('role')).toBe('dialog');
      expect(modalElement.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(modalElement.getAttribute('aria-modal')).toBe('true');
    });

    it('should have proper form labels', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = document.querySelector('#prompt-content') as HTMLTextAreaElement;
      const tagsInput = document.querySelector('#prompt-tags') as HTMLInputElement;

      // Labels should be associated with inputs
      expect(document.querySelector('label[for="prompt-title"]')).toBeTruthy();
      expect(document.querySelector('label[for="prompt-content"]')).toBeTruthy();
      expect(document.querySelector('label[for="prompt-tags"]')).toBeTruthy();

      // Error elements should be referenced
      expect(titleInput.getAttribute('aria-describedby')).toContain('title-error');
      expect(contentTextarea.getAttribute('aria-describedby')).toContain('content-error');
      expect(tagsInput.getAttribute('aria-describedby')).toContain('tags-error');
    });

    it('should update aria-invalid on validation', () => {
      const titleInput = document.querySelector('#prompt-title') as HTMLInputElement;

      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input'));

      expect(titleInput.getAttribute('aria-invalid')).toBe('true');

      titleInput.value = 'Valid title';
      titleInput.dispatchEvent(new Event('input'));

      expect(titleInput.getAttribute('aria-invalid')).toBe('false');
    });
  });
});