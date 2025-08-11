// PromptListContainer - Prompt List Management Component
// TASK-0012: プロンプト一覧表示機能

import { PopupStateManager } from './popup-state-manager';
import { PromptManager } from '../core/prompt-manager';
import { StorageManager } from '../core/storage-manager';
import { ClipboardManager } from '../core/clipboard-manager';
import { ErrorManager } from '../core/error-manager';
import type { Prompt, UserErrorInfo } from '../types';

export type SortOption = 'createdAt' | 'usedAt' | 'usageCount' | 'title';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';

export interface PromptListState {
  prompts: Prompt[];
  loading: boolean;
  error: Error | null;
  sortBy: SortOption;
  sortDirection: SortDirection;
  selectedPromptId: string | null;
  viewMode: ViewMode;
  filteredPrompts: Prompt[];
}

export interface PromptListElements {
  container: HTMLElement;
  header: HTMLElement;
  listContainer: HTMLElement;
  footer: HTMLElement;
  sortSelect: HTMLSelectElement;
  promptCount: HTMLElement;
}

export class PromptListContainer {
  private state: PromptListState = {
    prompts: [],
    loading: false,
    error: null,
    sortBy: 'usedAt',
    sortDirection: 'desc',
    selectedPromptId: null,
    viewMode: 'list',
    filteredPrompts: [],
  };

  private elements: PromptListElements;
  private listeners: Array<(state: PromptListState) => void> = [];
  private stateManager: PopupStateManager;
  private promptManager: PromptManager;
  private clipboardManager: ClipboardManager;
  private virtualizedList?: VirtualizedPromptList;

  constructor(
    stateManager: PopupStateManager,
    promptManager: PromptManager,
    clipboardManager: ClipboardManager
  ) {
    this.stateManager = stateManager;
    this.promptManager = promptManager;
    this.clipboardManager = clipboardManager;
    this.elements = this.initializeElements();
    this.setupEventListeners();
    this.initializeVirtualizedList();
  }

  // ========================================
  // PUBLIC METHODS
  // ========================================

  async initialize(): Promise<void> {
    try {
      await this.loadPrompts();
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  async loadPrompts(): Promise<void> {
    this.setState({ loading: true, error: null });

    try {
      const prompts = await this.promptManager.getAllPrompts();
      this.setState({
        prompts,
        loading: false,
        filteredPrompts: this.sortPrompts(prompts),
      });

      this.updateUI();
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  async copyPrompt(promptId: string): Promise<void> {
    try {
      const prompt = this.state.prompts.find((p) => p.id === promptId);
      if (!prompt) {
        throw new Error('プロンプトが見つかりません');
      }

      await this.clipboardManager.copy(prompt.content);

      // Update usage statistics
      await this.promptManager.updateUsage(promptId);

      // Reload to reflect updated usage
      await this.loadPrompts();

      // Show success feedback
      this.stateManager.showSuccess('プロンプトをコピーしました', 2000);
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  async deletePrompt(promptId: string): Promise<void> {
    try {
      const confirmed = confirm('このプロンプトを削除しますか？');
      if (!confirmed) return;

      await this.promptManager.deletePrompt(promptId);
      await this.loadPrompts();

      this.stateManager.showSuccess('プロンプトを削除しました', 2000);
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  setSortOption(sortBy: SortOption, direction?: SortDirection): void {
    const sortDirection =
      direction ||
      (this.state.sortBy === sortBy
        ? this.state.sortDirection === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc');

    this.setState({
      sortBy,
      sortDirection,
      filteredPrompts: this.sortPrompts(this.state.prompts),
    });

    this.updateUI();
  }

  setViewMode(viewMode: ViewMode): void {
    this.setState({ viewMode });
    this.updateUI();
  }

  selectPrompt(promptId: string | null): void {
    this.setState({ selectedPromptId: promptId });
  }

  getState(): Readonly<PromptListState> {
    return { ...this.state };
  }

  subscribe(listener: (state: PromptListState) => void): () => void {
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

  private setState(newState: Partial<PromptListState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private initializeElements(): PromptListElements {
    const elements = {
      container: document.getElementById('prompt-list-container'),
      header: document.getElementById('prompt-list-header'),
      listContainer: document.getElementById('prompt-list'),
      footer: document.getElementById('prompt-list-footer'),
      sortSelect: document.getElementById('sort-select') as HTMLSelectElement,
      promptCount: document.getElementById('prompt-count'),
    };

    // Validate all elements exist
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        throw new Error(`Required element not found: ${key}`);
      }
    }

    return elements as PromptListElements;
  }

  private setupEventListeners(): void {
    // Sort selection
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const [sortBy, sortDirection] = target.value.split('-') as [SortOption, SortDirection];
        this.setSortOption(sortBy, sortDirection);
      });
    }

    // Keyboard navigation
    this.elements.listContainer.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.loadPrompts();
      }
    });
  }

  private initializeVirtualizedList(): void {
    this.virtualizedList = new VirtualizedPromptList(this.elements.listContainer, {
      itemHeight: 80,
      onItemClick: (promptId) => this.selectPrompt(promptId),
      onCopyClick: (promptId) => this.copyPrompt(promptId),
      onDeleteClick: (promptId) => this.deletePrompt(promptId),
      onEditClick: (promptId) => this.editPrompt(promptId),
    });
  }

  private sortPrompts(prompts: Prompt[]): Prompt[] {
    const { sortBy, sortDirection } = this.state;

    return [...prompts].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'usedAt':
          const aUsed = a.usedAt ? new Date(a.usedAt).getTime() : 0;
          const bUsed = b.usedAt ? new Date(b.usedAt).getTime() : 0;
          comparison = aUsed - bUsed;
          break;
        case 'usageCount':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'ja');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private updateUI(): void {
    // Update sort select
    if (this.elements.sortSelect) {
      this.elements.sortSelect.value = `${this.state.sortBy}-${this.state.sortDirection}`;
    }

    // Update prompt count
    if (this.elements.promptCount) {
      const count = this.state.filteredPrompts.length;
      const total = this.state.prompts.length;

      if (count === total) {
        this.elements.promptCount.textContent = `${count}件のプロンプト`;
      } else {
        this.elements.promptCount.textContent = `${count}件表示中 (全${total}件)`;
      }
    }

    // Update virtualized list
    if (this.virtualizedList) {
      this.virtualizedList.updateItems(this.state.filteredPrompts);
    }

    // Update container classes for view mode
    this.elements.container.className = `prompt-list-container view-mode-${this.state.viewMode}`;
  }

  private handleKeyboardNavigation(e: KeyboardEvent): void {
    const { filteredPrompts, selectedPromptId } = this.state;

    if (filteredPrompts.length === 0) return;

    const currentIndex = selectedPromptId
      ? filteredPrompts.findIndex((p) => p.id === selectedPromptId)
      : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, filteredPrompts.length - 1);
        this.selectPrompt(filteredPrompts[nextIndex]?.id || null);
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        this.selectPrompt(filteredPrompts[prevIndex]?.id || null);
        break;

      case 'Enter':
        if (selectedPromptId) {
          e.preventDefault();
          this.copyPrompt(selectedPromptId);
        }
        break;

      case 'Delete':
        if (selectedPromptId && confirm('選択したプロンプトを削除しますか？')) {
          e.preventDefault();
          this.deletePrompt(selectedPromptId);
        }
        break;

      case 'Escape':
        this.selectPrompt(null);
        break;
    }
  }

  private async editPrompt(promptId: string): Promise<void> {
    // Emit event for parent to handle
    window.dispatchEvent(
      new CustomEvent('prompt:edit', {
        detail: { promptId },
      })
    );
  }

  private async handleError(error: Error): Promise<void> {
    try {
      await ErrorManager.logError(error, {
        module: 'PromptListContainer',
        function: 'handleError',
        metadata: {
          promptCount: this.state.prompts.length,
          currentSort: this.state.sortBy,
        },
      });

      const userError = ErrorManager.handleUserError(error);
      this.setState({ loading: false, error });
      this.stateManager.showError(userError);
    } catch (handlingError) {
      console.error('Failed to handle error:', handlingError);
      this.setState({ loading: false, error });
      this.stateManager.showError({
        title: 'エラーが発生しました',
        message: '予期しないエラーが発生しました。再読み込みしてください。',
        actionable: true,
        actions: [{ label: '再読み込み', action: 'reload' }],
        severity: 'error',
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in prompt list listener:', error);
      }
    });
  }
}

// ========================================
// VIRTUALIZED LIST IMPLEMENTATION
// ========================================

interface VirtualizedPromptListOptions {
  itemHeight: number;
  onItemClick: (promptId: string) => void;
  onCopyClick: (promptId: string) => void;
  onDeleteClick: (promptId: string) => void;
  onEditClick: (promptId: string) => void;
}

class VirtualizedPromptList {
  private container: HTMLElement;
  private options: VirtualizedPromptListOptions;
  private items: Prompt[] = [];
  private viewportHeight: number;
  private scrollTop = 0;
  private bufferSize = 3;

  constructor(container: HTMLElement, options: VirtualizedPromptListOptions) {
    this.container = container;
    this.options = options;
    this.viewportHeight = container.offsetHeight || 400;

    this.setupScrollListener();
  }

  updateItems(items: Prompt[]): void {
    this.items = items;
    this.render();
  }

  private setupScrollListener(): void {
    this.container.addEventListener(
      'scroll',
      () => {
        this.scrollTop = this.container.scrollTop;
        this.render();
      },
      { passive: true }
    );
  }

  private getVisibleRange(): [number, number] {
    const start = Math.floor(this.scrollTop / this.options.itemHeight);
    const visibleCount = Math.ceil(this.viewportHeight / this.options.itemHeight);

    return [
      Math.max(0, start - this.bufferSize),
      Math.min(this.items.length, start + visibleCount + this.bufferSize),
    ];
  }

  private render(): void {
    const [startIndex, endIndex] = this.getVisibleRange();
    const totalHeight = this.items.length * this.options.itemHeight;

    // Clear container
    this.container.innerHTML = '';

    // Create spacer for items above viewport
    if (startIndex > 0) {
      const topSpacer = document.createElement('div');
      topSpacer.style.height = `${startIndex * this.options.itemHeight}px`;
      this.container.appendChild(topSpacer);
    }

    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const prompt = this.items[i];
      if (prompt) {
        const itemElement = this.createPromptItem(prompt);
        this.container.appendChild(itemElement);
      }
    }

    // Create spacer for items below viewport
    if (endIndex < this.items.length) {
      const bottomSpacer = document.createElement('div');
      const remainingHeight = (this.items.length - endIndex) * this.options.itemHeight;
      bottomSpacer.style.height = `${remainingHeight}px`;
      this.container.appendChild(bottomSpacer);
    }

    // Update container scroll height
    this.container.style.height = `${totalHeight}px`;
  }

  private createPromptItem(prompt: Prompt): HTMLElement {
    const item = document.createElement('div');
    item.className = 'prompt-item';
    item.style.height = `${this.options.itemHeight}px`;
    item.dataset.promptId = prompt.id;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');

    const preview =
      prompt.content.length > 50 ? prompt.content.substring(0, 50) + '...' : prompt.content;

    const formatDate = (date: string | Date) => {
      return new Intl.RelativeTimeFormat('ja').format(
        Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        'day'
      );
    };

    item.innerHTML = `
      <div class="prompt-item-content">
        <div class="prompt-item-header">
          <h3 class="prompt-title">${this.escapeHtml(prompt.title)}</h3>
          <div class="prompt-actions">
            <button class="action-btn copy-btn" title="コピー" aria-label="プロンプトをコピー">
              <span aria-hidden="true">📋</span>
            </button>
            <button class="action-btn edit-btn" title="編集" aria-label="プロンプトを編集">
              <span aria-hidden="true">✏️</span>
            </button>
            <button class="action-btn delete-btn" title="削除" aria-label="プロンプトを削除">
              <span aria-hidden="true">🗑️</span>
            </button>
          </div>
        </div>
        <div class="prompt-preview">${this.escapeHtml(preview)}</div>
        <div class="prompt-meta">
          <span class="usage-count">👥 ${prompt.usageCount}回使用</span>
          <span class="used-at">📅 ${prompt.usedAt ? formatDate(prompt.usedAt) : '未使用'}</span>
          ${
            prompt.tags && prompt.tags.length > 0
              ? `<span class="tags">🏷️ ${prompt.tags.join(', ')}</span>`
              : ''
          }
        </div>
      </div>
    `;

    // Add event listeners
    item.addEventListener('click', () => {
      this.options.onItemClick(prompt.id);
    });

    const copyBtn = item.querySelector('.copy-btn') as HTMLButtonElement;
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onCopyClick(prompt.id);
    });

    const editBtn = item.querySelector('.edit-btn') as HTMLButtonElement;
    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onEditClick(prompt.id);
    });

    const deleteBtn = item.querySelector('.delete-btn') as HTMLButtonElement;
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onDeleteClick(prompt.id);
    });

    return item;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
