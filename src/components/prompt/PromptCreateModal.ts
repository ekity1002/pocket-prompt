// Prompt Create Modal Component
// TASK-0021: プロンプト追加モーダルUI実装

import type { CreatePromptRequest } from '@/types';
import { validatePromptTitle, validatePromptContent, validateTags } from '@/types';

export interface PromptCreateModalOptions {
  onSave: (promptData: CreatePromptRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    title: string;
    content: string;
    tags: string[];
  };
}

export interface PromptFormState {
  title: string;
  content: string;
  tags: string[];
  errors: {
    title: string[];
    content: string[];
    tags: string[];
  };
  isValid: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

/**
 * Modal component for creating new prompts
 */
export class PromptCreateModal {
  private element: HTMLElement | null = null;
  private state: PromptFormState = {
    title: '',
    content: '',
    tags: [],
    errors: { title: [], content: [], tags: [] },
    isValid: false,
    isDirty: false,
    isSaving: false,
  };
  private options: PromptCreateModalOptions;
  private autoSaveTimeout: NodeJS.Timeout | null = null;

  constructor(options: PromptCreateModalOptions) {
    this.options = options;
    
    // Set initial data if provided
    if (options.initialData) {
      this.state.title = options.initialData.title;
      this.state.content = options.initialData.content;
      this.state.tags = [...options.initialData.tags];
      this.state.isDirty = false; // Not dirty since it's initial data
    }
    
    this.createElement();
    this.setInitialValues();
    this.setupEventListeners();
  }

  /**
   * Show the modal
   */
  public show(): void {
    if (!this.element) return;

    // Add modal to DOM
    document.body.appendChild(this.element);

    // Load draft data if available
    this.loadDraftData();

    // Show modal with animation
    requestAnimationFrame(() => {
      this.element?.classList.add('show');

      // Focus on title field
      const titleField = this.element?.querySelector('#prompt-title') as HTMLInputElement;
      titleField?.focus();
    });

    // Trap focus within modal
    this.setupFocusTrap();

    // Handle escape key
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Hide the modal
   */
  public hide(): void {
    if (!this.element) return;

    this.element.classList.remove('show');

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.element?.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 200);

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Destroy the modal and cleanup resources
   */
  public destroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.hide();
    this.element = null;
  }

  /**
   * Create modal DOM element
   */
  private createElement(): void {
    this.element = document.createElement('div');
    this.element.className = 'prompt-create-modal';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-labelledby', 'modal-title');
    this.element.setAttribute('aria-modal', 'true');

    this.element.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">📝 ${this.options.initialData ? 'プロンプト編集' : '新しいプロンプト作成'}</h2>
            <button type="button" class="modal-close" aria-label="閉じる">✕</button>
          </div>
          
          <form class="prompt-form" novalidate>
            <div class="field-group">
              <label for="prompt-title" class="field-label">
                タイトル <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <input 
                  type="text" 
                  id="prompt-title" 
                  name="title"
                  class="form-input" 
                  placeholder="プロンプトのタイトルを入力"
                  maxlength="200"
                  required
                  aria-describedby="title-error title-counter"
                />
                <div class="character-counter" id="title-counter">0/200</div>
              </div>
              <div class="field-error" id="title-error" role="alert"></div>
            </div>

            <div class="field-group">
              <label for="prompt-content" class="field-label">
                本文 <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <textarea 
                  id="prompt-content" 
                  name="content"
                  class="form-textarea" 
                  placeholder="プロンプトの内容を入力..."
                  maxlength="10000"
                  rows="8"
                  required
                  aria-describedby="content-error content-counter"
                ></textarea>
                <div class="character-counter" id="content-counter">0/10,000</div>
              </div>
              <div class="field-error" id="content-error" role="alert"></div>
            </div>

            <div class="field-group">
              <label for="prompt-tags" class="field-label">
                タグ <span class="optional">(任意)</span>
              </label>
              <div class="input-wrapper">
                <input 
                  type="text" 
                  id="prompt-tags" 
                  name="tags"
                  class="form-input" 
                  placeholder="タグをカンマ区切りで入力 (例: javascript, プログラミング)"
                  aria-describedby="tags-error tags-help"
                />
                <div class="field-help" id="tags-help">カンマ区切りで複数のタグを入力できます</div>
              </div>
              <div class="field-error" id="tags-error" role="alert"></div>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-btn">
              キャンセル
            </button>
            <button type="submit" class="btn btn-primary save-btn" disabled>
              <span class="btn-text">${this.options.initialData ? '更新' : '保存'}</span>
              <span class="btn-spinner hidden">${this.options.initialData ? '更新中...' : '保存中...'}</span>
            </button>
          </div>

          <div class="modal-status" role="status" aria-live="polite"></div>
        </div>
      </div>
    `;

    this.addModalStyles();
  }

  /**
   * Set initial values in form fields
   */
  private setInitialValues(): void {
    if (!this.element) return;

    const titleInput = this.element.querySelector('#prompt-title') as HTMLInputElement;
    const contentTextarea = this.element.querySelector('#prompt-content') as HTMLTextAreaElement;
    const tagsInput = this.element.querySelector('#prompt-tags') as HTMLInputElement;

    if (titleInput) {
      titleInput.value = this.state.title;
      this.updateCharacterCounter('title', this.state.title, 200);
    }

    if (contentTextarea) {
      contentTextarea.value = this.state.content;
      this.updateCharacterCounter('content', this.state.content, 10000);
      this.autoResizeTextarea(contentTextarea);
    }

    if (tagsInput) {
      tagsInput.value = this.state.tags.join(', ');
    }

    // Update form validity after setting initial values
    this.updateFormValidity();
  }

  /**
   * Add CSS styles to modal
   */
  private addModalStyles(): void {
    if (document.querySelector('#prompt-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'prompt-modal-styles';
    styles.textContent = `
      .prompt-create-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .prompt-create-modal.show {
        opacity: 1;
        visibility: visible;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        transform: scale(0.9);
        transition: transform 0.2s ease;
      }

      .prompt-create-modal.show .modal-content {
        transform: scale(1);
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 20px 0;
        border-bottom: 1px solid #e1e5e9;
        margin-bottom: 20px;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #718096;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .modal-close:hover {
        background-color: #f7fafc;
        color: #2d3748;
      }

      .prompt-form {
        padding: 0 20px;
      }

      .field-group {
        margin-bottom: 20px;
      }

      .field-label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #2d3748;
        font-size: 14px;
      }

      .required {
        color: #e53e3e;
      }

      .optional {
        color: #718096;
        font-weight: 400;
      }

      .input-wrapper {
        position: relative;
      }

      .form-input, .form-textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1.4;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }

      .form-input:focus, .form-textarea:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
      }

      .form-textarea {
        resize: vertical;
        min-height: 120px;
      }

      .character-counter {
        position: absolute;
        bottom: 8px;
        right: 12px;
        font-size: 12px;
        color: #718096;
        background: rgba(255, 255, 255, 0.9);
        padding: 2px 4px;
        border-radius: 3px;
      }

      .character-counter.warning {
        color: #d69e2e;
        font-weight: 500;
      }

      .character-counter.danger {
        color: #e53e3e;
        font-weight: 500;
      }

      .field-error {
        margin-top: 6px;
        font-size: 12px;
        color: #e53e3e;
        min-height: 16px;
      }

      .field-help {
        margin-top: 4px;
        font-size: 12px;
        color: #718096;
      }

      .form-input.error, .form-textarea.error {
        border-color: #e53e3e;
        box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
      }

      .form-input.success, .form-textarea.success {
        border-color: #38a169;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px;
        border-top: 1px solid #e1e5e9;
        margin-top: 20px;
      }

      .btn {
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .btn-primary {
        background-color: #3182ce;
        color: white;
        border: 1px solid #3182ce;
      }

      .btn-primary:hover:not(:disabled) {
        background-color: #2c5282;
        border-color: #2c5282;
      }

      .btn-secondary {
        background-color: white;
        color: #4a5568;
        border: 1px solid #e2e8f0;
      }

      .btn-secondary:hover {
        background-color: #f7fafc;
        border-color: #cbd5e0;
      }

      .btn-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
      }

      .hidden {
        display: none;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .modal-status {
        padding: 0 20px 20px;
        font-size: 14px;
        text-align: center;
        min-height: 20px;
      }

      .status-success {
        color: #38a169;
      }

      .status-error {
        color: #e53e3e;
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .modal-content {
          background: #2d3748;
          color: #f7fafc;
        }

        .modal-header {
          border-color: #4a5568;
        }

        .modal-header h2 {
          color: #f7fafc;
        }

        .form-input, .form-textarea {
          background: #4a5568;
          border-color: #718096;
          color: #f7fafc;
        }

        .field-label {
          color: #e2e8f0;
        }

        .modal-footer {
          border-color: #4a5568;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.element) return;

    // Form elements
    const titleInput = this.element.querySelector('#prompt-title') as HTMLInputElement;
    const contentTextarea = this.element.querySelector('#prompt-content') as HTMLTextAreaElement;
    const tagsInput = this.element.querySelector('#prompt-tags') as HTMLInputElement;
    const saveButton = this.element.querySelector('.save-btn') as HTMLButtonElement;
    const cancelButton = this.element.querySelector('.cancel-btn') as HTMLButtonElement;
    const closeButton = this.element.querySelector('.modal-close') as HTMLButtonElement;
    const form = this.element.querySelector('.prompt-form') as HTMLFormElement;

    // Input event listeners
    titleInput?.addEventListener('input', () => this.handleTitleChange());
    contentTextarea?.addEventListener('input', () => this.handleContentChange());
    tagsInput?.addEventListener('input', () => this.handleTagsChange());

    // Button event listeners
    saveButton?.addEventListener('click', () => this.handleSave());
    cancelButton?.addEventListener('click', () => this.handleCancel());
    closeButton?.addEventListener('click', () => this.handleCancel());

    // Form submission
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    // Modal overlay click (close modal)
    this.element.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.handleCancel();
      }
    });
  }

  /**
   * Handle title input change
   */
  private handleTitleChange(): void {
    const titleInput = this.element?.querySelector('#prompt-title') as HTMLInputElement;
    const title = titleInput.value.trim();

    this.state.title = title;
    this.state.isDirty = true;

    // Update character counter
    this.updateCharacterCounter('title', title, 200);

    // Validate title
    this.validateField('title');

    // Auto-save draft
    this.scheduleAutoSave();
  }

  /**
   * Handle content textarea change
   */
  private handleContentChange(): void {
    const contentTextarea = this.element?.querySelector('#prompt-content') as HTMLTextAreaElement;
    const content = contentTextarea.value.trim();

    this.state.content = content;
    this.state.isDirty = true;

    // Update character counter
    this.updateCharacterCounter('content', content, 10000);

    // Auto-resize textarea
    this.autoResizeTextarea(contentTextarea);

    // Validate content
    this.validateField('content');

    // Auto-save draft
    this.scheduleAutoSave();
  }

  /**
   * Handle tags input change
   */
  private handleTagsChange(): void {
    const tagsInput = this.element?.querySelector('#prompt-tags') as HTMLInputElement;
    const tagsText = tagsInput.value.trim();

    // Parse tags (comma-separated)
    this.state.tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    this.state.isDirty = true;

    // Validate tags
    this.validateField('tags');

    // Auto-save draft
    this.scheduleAutoSave();
  }

  /**
   * Update character counter
   */
  private updateCharacterCounter(field: string, text: string, maxLength: number): void {
    const counter = this.element?.querySelector(`#${field}-counter`) as HTMLElement;
    if (!counter) return;

    const length = text.length;
    counter.textContent = `${length}/${maxLength.toLocaleString()}`;

    // Update counter styling based on usage
    counter.classList.remove('warning', 'danger');
    if (length >= maxLength * 0.9) {
      counter.classList.add('warning');
    }
    if (length >= maxLength) {
      counter.classList.add('danger');
    }
  }

  /**
   * Auto-resize textarea
   */
  private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
  }

  /**
   * Validate a specific field
   */
  private validateField(field: 'title' | 'content' | 'tags'): void {
    let errors: string[] = [];

    switch (field) {
      case 'title':
        errors = validatePromptTitle(this.state.title);
        break;
      case 'content':
        errors = validatePromptContent(this.state.content);
        break;
      case 'tags':
        errors = validateTags(this.state.tags);
        break;
    }

    this.state.errors[field] = errors;
    this.updateFieldUI(field, errors);
    this.updateFormValidity();
  }

  /**
   * Update field UI based on validation
   */
  private updateFieldUI(field: string, errors: string[]): void {
    const input = this.element?.querySelector(`#prompt-${field}`) as HTMLInputElement;
    const errorElement = this.element?.querySelector(`#${field}-error`) as HTMLElement;

    if (!input || !errorElement) return;

    // Update input styling
    input.classList.remove('error', 'success');
    if (errors.length > 0) {
      input.classList.add('error');
      input.setAttribute('aria-invalid', 'true');
    } else if (this.state[field as keyof PromptFormState]) {
      input.classList.add('success');
      input.setAttribute('aria-invalid', 'false');
    }

    // Update error message
    errorElement.textContent = errors[0] || '';
  }

  /**
   * Update overall form validity
   */
  private updateFormValidity(): void {
    const hasErrors = Object.values(this.state.errors).some((errors) => errors.length > 0);
    const hasRequiredFields = this.state.title.length > 0 && this.state.content.length > 0;

    this.state.isValid = !hasErrors && hasRequiredFields;

    // Update save button
    const saveButton = this.element?.querySelector('.save-btn') as HTMLButtonElement;
    if (saveButton) {
      saveButton.disabled = !this.state.isValid || this.state.isSaving;
    }
  }

  /**
   * Schedule auto-save of draft
   */
  private scheduleAutoSave(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveCurrentDraft();
    }, 5000); // 5 seconds
  }

  /**
   * Save current form data as draft
   */
  private saveCurrentDraft(): void {
    if (!this.state.isDirty) return;

    const draftData = {
      title: this.state.title,
      content: this.state.content,
      tags: this.state.tags,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('prompt_create_draft', JSON.stringify(draftData));
      console.log('Draft saved automatically');
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }

  /**
   * Load draft data if available
   */
  private loadDraftData(): void {
    try {
      const draftJson = localStorage.getItem('prompt_create_draft');
      if (!draftJson) return;

      const draft = JSON.parse(draftJson);

      // Check if draft is recent (within 24 hours)
      const ageHours = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
      if (ageHours > 24) {
        localStorage.removeItem('prompt_create_draft');
        return;
      }

      // Populate form with draft data
      const titleInput = this.element?.querySelector('#prompt-title') as HTMLInputElement;
      const contentTextarea = this.element?.querySelector('#prompt-content') as HTMLTextAreaElement;
      const tagsInput = this.element?.querySelector('#prompt-tags') as HTMLInputElement;

      if (titleInput && draft.title) {
        titleInput.value = draft.title;
        this.handleTitleChange();
      }

      if (contentTextarea && draft.content) {
        contentTextarea.value = draft.content;
        this.handleContentChange();
      }

      if (tagsInput && draft.tags && draft.tags.length > 0) {
        tagsInput.value = draft.tags.join(', ');
        this.handleTagsChange();
      }

      // Show notification about loaded draft
      this.showStatus('下書きを復元しました', 'success');
    } catch (error) {
      console.warn('Failed to load draft:', error);
      localStorage.removeItem('prompt_create_draft');
    }
  }

  /**
   * Clear saved draft
   */
  private clearDraft(): void {
    localStorage.removeItem('prompt_create_draft');
  }

  /**
   * Handle save button click
   */
  private async handleSave(): Promise<void> {
    if (!this.state.isValid || this.state.isSaving) return;

    this.state.isSaving = true;
    this.updateSavingState(true);

    try {
      const promptData: CreatePromptRequest = {
        title: this.state.title,
        content: this.state.content,
        tags: this.state.tags,
      };

      await this.options.onSave(promptData);

      // Clear draft and close modal
      this.clearDraft();
      this.showStatus('プロンプトを保存しました', 'success');

      setTimeout(() => {
        this.hide();
      }, 1000);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      const message = error instanceof Error ? error.message : '保存に失敗しました';
      this.showStatus(message, 'error');
    } finally {
      this.state.isSaving = false;
      this.updateSavingState(false);
    }
  }

  /**
   * Handle cancel button click
   */
  private handleCancel(): void {
    if (this.state.isDirty) {
      const confirmed = confirm('変更が保存されていません。閉じてもよろしいですか？');
      if (!confirmed) return;
    }

    this.options.onCancel();
    this.hide();
  }

  /**
   * Update saving state UI
   */
  private updateSavingState(saving: boolean): void {
    const saveButton = this.element?.querySelector('.save-btn') as HTMLButtonElement;
    const btnText = saveButton?.querySelector('.btn-text') as HTMLElement;
    const btnSpinner = saveButton?.querySelector('.btn-spinner') as HTMLElement;

    if (saving) {
      saveButton.disabled = true;
      btnText?.classList.add('hidden');
      btnSpinner?.classList.remove('hidden');
    } else {
      saveButton.disabled = !this.state.isValid;
      btnText?.classList.remove('hidden');
      btnSpinner?.classList.add('hidden');
    }
  }

  /**
   * Show status message
   */
  private showStatus(message: string, type: 'success' | 'error' = 'success'): void {
    const statusElement = this.element?.querySelector('.modal-status') as HTMLElement;
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `modal-status status-${type}`;

    // Clear status after delay
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'modal-status';
    }, 5000);
  }

  /**
   * Setup focus trap for accessibility
   */
  private setupFocusTrap(): void {
    const focusableElements = this.element?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    ) as NodeListOf<HTMLElement>;

    if (!focusableElements || focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable.focus();

    // Trap focus within modal
    this.element?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Escape key - close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
      return;
    }

    // Ctrl/Cmd + S - save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.handleSave();
      return;
    }

    // Ctrl/Cmd + Enter - save and close
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.handleSave();
      return;
    }
  };
}
