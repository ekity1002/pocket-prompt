// PromptEditor - Prompt Creation and Editing Component
// TASK-0013: プロンプト作成・編集機能

import { PopupStateManager } from './popup-state-manager';
import { PromptManager } from '../core/prompt-manager';
import { ErrorManager } from '../core/error-manager';
import type { Prompt, UserErrorInfo } from '../types';

export type EditorMode = 'create' | 'edit';

export interface ValidationState {
  title: { valid: boolean; message: string };
  content: { valid: boolean; message: string };
  tags: { valid: boolean; message: string };
  isFormValid: boolean;
}

export interface PromptEditorState {
  mode: EditorMode;
  prompt: Partial<Prompt>;
  validation: ValidationState;
  isDirty: boolean;
  isSaving: boolean;
  hasAutoSave: boolean;
  errors: { [field: string]: string };
  isVisible: boolean;
}

export interface PromptEditorElements {
  modal: HTMLElement;
  overlay: HTMLElement;
  form: HTMLFormElement;
  titleField: HTMLInputElement;
  contentField: HTMLTextAreaElement;
  tagsField: HTMLInputElement;
  titleCounter: HTMLElement;
  contentCounter: HTMLElement;
  saveButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  errorContainer: HTMLElement;
}

export class PromptEditor {
  private state: PromptEditorState = {
    mode: 'create',
    prompt: {},
    validation: {
      title: { valid: false, message: '' },
      content: { valid: false, message: '' },
      tags: { valid: true, message: '' },
      isFormValid: false,
    },
    isDirty: false,
    isSaving: false,
    hasAutoSave: false,
    errors: {},
    isVisible: false,
  };

  private elements: PromptEditorElements;
  private listeners: Array<(state: PromptEditorState) => void> = [];
  private stateManager: PopupStateManager;
  private promptManager: PromptManager;
  private validationManager: ValidationManager;
  private autoSaveManager: AutoSaveManager;
  private validationTimeout: NodeJS.Timeout | null = null;

  constructor(stateManager: PopupStateManager, promptManager: PromptManager) {
    this.stateManager = stateManager;
    this.promptManager = promptManager;
    this.elements = this.initializeElements();
    this.validationManager = new ValidationManager();
    this.autoSaveManager = new AutoSaveManager();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  show(mode: EditorMode = 'create', promptId?: string): void {
    this.setState({
      mode,
      isVisible: true,
      prompt: {},
      validation: this.getInitialValidationState(),
      isDirty: false,
    });

    if (mode === 'edit' && promptId) {
      this.loadPromptForEditing(promptId);
    } else {
      this.checkForAutoSave();
    }

    this.showModal();
  }

  hide(): void {
    if (this.state.isDirty && !confirm('変更が保存されていません。閉じてもよろしいですか？')) {
      return;
    }

    this.setState({ isVisible: false });
    this.hideModal();
    this.clearForm();
  }

  async save(): Promise<boolean> {
    if (!this.state.validation.isFormValid) {
      this.showValidationErrors();
      return false;
    }

    this.setState({ isSaving: true });

    try {
      const promptData: Partial<Prompt> = {
        title: this.state.prompt.title?.trim(),
        content: this.state.prompt.content?.trim(),
        tags: this.state.prompt.tags || [],
      };

      let savedPrompt: Prompt;

      if (this.state.mode === 'edit' && this.state.prompt.id) {
        savedPrompt = await this.promptManager.updatePrompt(this.state.prompt.id, promptData);
      } else {
        savedPrompt = await this.promptManager.createPrompt(promptData);
      }

      // Clear auto-save
      this.autoSaveManager.clearAutoSave();

      // Show success feedback
      const message =
        this.state.mode === 'create' ? 'プロンプトを作成しました' : 'プロンプトを更新しました';
      this.stateManager.showSuccess(message, 2000);

      // Update state and hide
      this.setState({
        isSaving: false,
        isDirty: false,
        hasAutoSave: false,
      });

      this.hide();

      // Emit save event
      window.dispatchEvent(
        new CustomEvent('prompt:saved', {
          detail: { prompt: savedPrompt, mode: this.state.mode },
        })
      );

      return true;
    } catch (error) {
      await this.handleError(error as Error);
      this.setState({ isSaving: false });
      return false;
    }
  }

  async saveAndClose(): Promise<void> {
    const saved = await this.save();
    if (saved) {
      this.hide();
    }
  }

  getState(): Readonly<PromptEditorState> {
    return { ...this.state };
  }

  subscribe(listener: (state: PromptEditorState) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private setState(newState: Partial<PromptEditorState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private initializeElements(): PromptEditorElements {
    const elements = {
      modal: document.getElementById('prompt-editor-modal'),
      overlay: document.getElementById('prompt-editor-overlay'),
      form: document.getElementById('prompt-editor-form') as HTMLFormElement,
      titleField: document.getElementById('prompt-title-field') as HTMLInputElement,
      contentField: document.getElementById('prompt-content-field') as HTMLTextAreaElement,
      tagsField: document.getElementById('prompt-tags-field') as HTMLInputElement,
      titleCounter: document.getElementById('title-counter'),
      contentCounter: document.getElementById('content-counter'),
      saveButton: document.getElementById('prompt-save-btn') as HTMLButtonElement,
      cancelButton: document.getElementById('prompt-cancel-btn') as HTMLButtonElement,
      errorContainer: document.getElementById('prompt-editor-errors'),
    };

    // Validate all elements exist
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        throw new Error(`Required element not found: ${key}`);
      }
    }

    return elements as PromptEditorElements;
  }

  private setupEventListeners(): void {
    // Form input events
    this.elements.titleField.addEventListener('input', () => {
      this.handleFieldChange('title', this.elements.titleField.value);
    });

    this.elements.contentField.addEventListener('input', () => {
      this.handleFieldChange('content', this.elements.contentField.value);
      this.adjustTextareaHeight();
    });

    this.elements.tagsField.addEventListener('input', () => {
      this.handleTagsChange(this.elements.tagsField.value);
    });

    // Button events
    this.elements.saveButton.addEventListener('click', () => {
      this.save();
    });

    this.elements.cancelButton.addEventListener('click', () => {
      this.hide();
    });

    // Modal overlay click to close
    this.elements.overlay.addEventListener('click', () => {
      this.hide();
    });

    // Prevent modal content click from closing
    this.elements.modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Form submit prevention
    this.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.state.isVisible) return;

      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.save();
      }

      // Ctrl+Enter: Save and close
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.saveAndClose();
      }

      // Escape: Cancel
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  private handleFieldChange(field: 'title' | 'content', value: string): void {
    // Update prompt data
    const newPrompt = { ...this.state.prompt, [field]: value };
    this.setState({
      prompt: newPrompt,
      isDirty: true,
    });

    // Update character counters
    this.updateCharacterCounters();

    // Schedule validation
    this.scheduleValidation();

    // Schedule auto-save
    this.autoSaveManager.scheduleAutoSave(newPrompt);
  }

  private handleTagsChange(value: string): void {
    // Parse tags (space or comma separated)
    const tags = value
      .split(/[,\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 10); // Limit to 10 tags

    const newPrompt = { ...this.state.prompt, tags };
    this.setState({
      prompt: newPrompt,
      isDirty: true,
    });

    this.scheduleValidation();
    this.autoSaveManager.scheduleAutoSave(newPrompt);
  }

  private scheduleValidation(): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }

    this.validationTimeout = setTimeout(() => {
      this.validateForm();
    }, 300); // 300ms debounce
  }

  private validateForm(): void {
    const validation = this.validationManager.validatePrompt(this.state.prompt);
    this.setState({ validation });
    this.updateValidationUI(validation);
  }

  private updateValidationUI(validation: ValidationState): void {
    // Update title field
    this.updateFieldValidation('title', validation.title);

    // Update content field
    this.updateFieldValidation('content', validation.content);

    // Update tags field
    this.updateFieldValidation('tags', validation.tags);

    // Update save button state
    this.elements.saveButton.disabled = !validation.isFormValid || this.state.isSaving;
  }

  private updateFieldValidation(
    field: string,
    fieldValidation: { valid: boolean; message: string }
  ): void {
    const fieldElement = this.elements[
      `${field}Field` as keyof PromptEditorElements
    ] as HTMLInputElement;
    const fieldContainer = fieldElement.closest('.field-container');
    const errorElement = fieldContainer?.querySelector('.field-error');

    if (fieldValidation.valid) {
      fieldElement.classList.remove('field-error');
      fieldElement.classList.add('field-valid');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.setAttribute('aria-hidden', 'true');
      }
    } else {
      fieldElement.classList.add('field-error');
      fieldElement.classList.remove('field-valid');
      if (errorElement) {
        errorElement.textContent = fieldValidation.message;
        errorElement.setAttribute('aria-hidden', 'false');
      }
    }

    // Update ARIA attributes
    fieldElement.setAttribute('aria-invalid', fieldValidation.valid ? 'false' : 'true');
  }

  private updateCharacterCounters(): void {
    // Title counter
    const titleLength = this.state.prompt.title?.length || 0;
    const titleMax = 100;
    this.elements.titleCounter.textContent = `${titleLength}/${titleMax}`;
    this.elements.titleCounter.className = this.getCounterClass(titleLength, titleMax);

    // Content counter
    const contentLength = this.state.prompt.content?.length || 0;
    const contentMax = 10000;
    this.elements.contentCounter.textContent = `${contentLength}/${contentMax}`;
    this.elements.contentCounter.className = this.getCounterClass(contentLength, contentMax);
  }

  private getCounterClass(current: number, max: number): string {
    const percentage = (current / max) * 100;

    if (percentage >= 100) return 'character-counter counter-error';
    if (percentage >= 90) return 'character-counter counter-warning';
    return 'character-counter';
  }

  private adjustTextareaHeight(): void {
    const textarea = this.elements.contentField;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  private showModal(): void {
    this.elements.modal.hidden = false;
    this.elements.overlay.hidden = false;

    // Focus first field
    setTimeout(() => {
      this.elements.titleField.focus();
    }, 100);

    // Set up focus trap
    this.setupFocusTrap();
  }

  private hideModal(): void {
    this.elements.modal.hidden = true;
    this.elements.overlay.hidden = true;
    this.removeFocusTrap();
  }

  private setupFocusTrap(): void {
    const focusableElements = this.elements.modal.querySelectorAll(
      'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    this.elements.modal.addEventListener('keydown', handleTabKey);
    this.elements.modal.dataset.focusTrap = 'true';
  }

  private removeFocusTrap(): void {
    if (this.elements.modal.dataset.focusTrap) {
      // Remove event listeners would be handled by cleanup
      delete this.elements.modal.dataset.focusTrap;
    }
  }

  private clearForm(): void {
    this.elements.titleField.value = '';
    this.elements.contentField.value = '';
    this.elements.tagsField.value = '';
    this.updateCharacterCounters();
    this.clearValidationUI();
  }

  private clearValidationUI(): void {
    const fields = [this.elements.titleField, this.elements.contentField, this.elements.tagsField];
    fields.forEach((field) => {
      field.classList.remove('field-error', 'field-valid');
      field.setAttribute('aria-invalid', 'false');
    });

    const errorElements = this.elements.modal.querySelectorAll('.field-error');
    errorElements.forEach((element) => {
      element.textContent = '';
      element.setAttribute('aria-hidden', 'true');
    });
  }

  private async loadPromptForEditing(promptId: string): Promise<void> {
    try {
      const prompt = await this.promptManager.getPrompt(promptId);
      if (!prompt) {
        throw new Error('プロンプトが見つかりません');
      }

      this.setState({ prompt });

      // Update form fields
      this.elements.titleField.value = prompt.title;
      this.elements.contentField.value = prompt.content;
      this.elements.tagsField.value = prompt.tags?.join(', ') || '';

      this.updateCharacterCounters();
      this.adjustTextareaHeight();
      this.validateForm();
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  private checkForAutoSave(): void {
    const autoSaveData = this.autoSaveManager.getAutoSave();
    if (autoSaveData) {
      const shouldRestore = confirm(
        '下書きが見つかりました。復元しますか？\n' +
          `保存日時: ${new Date(autoSaveData.timestamp).toLocaleString()}`
      );

      if (shouldRestore) {
        this.restoreFromAutoSave(autoSaveData.data);
      } else {
        this.autoSaveManager.clearAutoSave();
      }
    }
  }

  private restoreFromAutoSave(promptData: Partial<Prompt>): void {
    this.setState({
      prompt: promptData,
      hasAutoSave: true,
      isDirty: true,
    });

    // Update form fields
    this.elements.titleField.value = promptData.title || '';
    this.elements.contentField.value = promptData.content || '';
    this.elements.tagsField.value = promptData.tags?.join(', ') || '';

    this.updateCharacterCounters();
    this.adjustTextareaHeight();
    this.validateForm();
  }

  private showValidationErrors(): void {
    const firstInvalidField = this.elements.modal.querySelector('.field-error') as HTMLElement;
    if (firstInvalidField) {
      firstInvalidField.focus();
      firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private getInitialValidationState(): ValidationState {
    return {
      title: { valid: false, message: '' },
      content: { valid: false, message: '' },
      tags: { valid: true, message: '' },
      isFormValid: false,
    };
  }

  private async handleError(error: Error): Promise<void> {
    try {
      await ErrorManager.logError(error, {
        module: 'PromptEditor',
        function: 'handleError',
        metadata: {
          mode: this.state.mode,
          promptId: this.state.prompt.id,
          isDirty: this.state.isDirty,
        },
      });

      const userError = ErrorManager.handleUserError(error);
      this.stateManager.showError(userError);
    } catch (handlingError) {
      console.error('Failed to handle error:', handlingError);
      this.stateManager.showError({
        title: 'エラーが発生しました',
        message: '予期しないエラーが発生しました。再度お試しください。',
        actionable: true,
        actions: [{ label: 'OK', action: 'dismiss' }],
        severity: 'error',
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in prompt editor listener:', error);
      }
    });
  }
}

// ========================================
// VALIDATION MANAGER
// ========================================

class ValidationManager {
  validatePrompt(prompt: Partial<Prompt>): ValidationState {
    const titleValidation = this.validateTitle(prompt.title);
    const contentValidation = this.validateContent(prompt.content);
    const tagsValidation = this.validateTags(prompt.tags);

    return {
      title: titleValidation,
      content: contentValidation,
      tags: tagsValidation,
      isFormValid: titleValidation.valid && contentValidation.valid && tagsValidation.valid,
    };
  }

  private validateTitle(title?: string): { valid: boolean; message: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, message: 'タイトルは必須です' };
    }

    if (title.length > 100) {
      return { valid: false, message: 'タイトルは100文字以内で入力してください' };
    }

    // Check for control characters
    if (/[\x00-\x1F\x7F]/.test(title)) {
      return { valid: false, message: 'タイトルに使用できない文字が含まれています' };
    }

    return { valid: true, message: '' };
  }

  private validateContent(content?: string): { valid: boolean; message: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, message: '本文は必須です' };
    }

    if (content.length > 10000) {
      return { valid: false, message: '本文は10,000文字以内で入力してください' };
    }

    return { valid: true, message: '' };
  }

  private validateTags(tags?: string[]): { valid: boolean; message: string } {
    if (!tags || tags.length === 0) {
      return { valid: true, message: '' };
    }

    if (tags.length > 10) {
      return { valid: false, message: 'タグは10個以内で設定してください' };
    }

    for (const tag of tags) {
      if (tag.length > 20) {
        return { valid: false, message: '各タグは20文字以内で設定してください' };
      }
    }

    return { valid: true, message: '' };
  }
}

// ========================================
// AUTO SAVE MANAGER
// ========================================

interface AutoSaveData {
  data: Partial<Prompt>;
  timestamp: number;
  version: string;
}

class AutoSaveManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 5000; // 5 seconds
  private readonly STORAGE_KEY = 'prompt_editor_draft';
  private readonly VERSION = '1.0';

  scheduleAutoSave(data: Partial<Prompt>): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToStorage(data);
    }, this.SAVE_DELAY);
  }

  getAutoSave(): AutoSaveData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as AutoSaveData;

      // Check if auto-save is recent (within 24 hours)
      const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        this.clearAutoSave();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load auto-save:', error);
      this.clearAutoSave();
      return null;
    }
  }

  clearAutoSave(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear auto-save:', error);
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  private saveToStorage(data: Partial<Prompt>): void {
    try {
      // Don't save if data is empty
      if (!data.title?.trim() && !data.content?.trim()) {
        return;
      }

      const autoSaveData: AutoSaveData = {
        data,
        timestamp: Date.now(),
        version: this.VERSION,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(autoSaveData));
    } catch (error) {
      console.error('Failed to save auto-save:', error);
    }
  }
}
