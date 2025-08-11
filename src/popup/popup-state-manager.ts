// PopupStateManager - UI State Management
// TASK-0011: ポップアップUI状態管理システム

import { ErrorManager } from '../core/error-manager';
import type { UserErrorInfo } from '../types';

export type UIViewState = 'loading' | 'empty' | 'content' | 'error' | 'success';

export interface UIState {
  currentView: UIViewState;
  isLoading: boolean;
  error: UserErrorInfo | null;
  data: any | null;
  searchQuery: string;
}

export interface StateDisplayElements {
  loading: HTMLElement;
  error: HTMLElement;
  empty: HTMLElement;
  success: HTMLElement;
  content: HTMLElement;
}

export class PopupStateManager {
  private state: UIState = {
    currentView: 'loading',
    isLoading: false,
    error: null,
    data: null,
    searchQuery: '',
  };

  private elements: StateDisplayElements;
  private listeners: Array<(state: UIState) => void> = [];

  constructor() {
    this.elements = this.initializeElements();
    this.setupEventListeners();
  }

  // ========================================
  // STATE MANAGEMENT METHODS
  // ========================================

  setState(newState: Partial<UIState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Update DOM based on state changes
    this.updateDOM(previousState);

    // Notify listeners
    this.notifyListeners();
  }

  getState(): Readonly<UIState> {
    return { ...this.state };
  }

  subscribe(listener: (state: UIState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // ========================================
  // HIGH-LEVEL STATE METHODS
  // ========================================

  showLoading(message: string = 'プロンプトを読み込み中...'): void {
    const previousView = this.state.currentView;

    this.setState({
      currentView: 'loading',
      isLoading: true,
      error: null,
    });

    const loadingText = this.elements.loading.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = message;
    }

    // Force immediate announcement for testing
    this.announceStateChange(previousView, 'loading');
  }

  showError(error: UserErrorInfo): void {
    this.setState({
      currentView: 'error',
      isLoading: false,
      error,
    });

    this.updateErrorDisplay(error);
  }

  showEmpty(): void {
    const previousView = this.state.currentView;

    this.setState({
      currentView: 'empty',
      isLoading: false,
      error: null,
      data: null,
    });

    // Force announcement for testing
    this.announceStateChange(previousView, 'empty');
  }

  showContent(data: any): void {
    this.setState({
      currentView: 'content',
      isLoading: false,
      error: null,
      data,
    });
  }

  showSuccess(message: string, duration: number = 3000): void {
    const successMessage = this.elements.success.querySelector('.success-message');
    if (successMessage) {
      successMessage.textContent = message;
    }

    this.setState({
      currentView: 'success',
      isLoading: false,
    });

    // Auto-hide success message after duration
    setTimeout(() => {
      if (this.state.currentView === 'success') {
        this.showContent(this.state.data);
      }
    }, duration);
  }

  // ========================================
  // ERROR HANDLING INTEGRATION
  // ========================================

  async handleError(error: Error): Promise<void> {
    try {
      // Log technical error
      await ErrorManager.logError(error, {
        module: 'PopupUI',
        function: 'handleError',
        metadata: {
          currentView: this.state.currentView,
          hasData: !!this.state.data,
        },
      });

      // Convert to user-friendly error
      const userError = ErrorManager.handleUserError(error);
      this.showError(userError);
    } catch (handlingError) {
      // Fallback error handling if ErrorManager fails
      console.error('Failed to handle error:', handlingError);
      this.showError({
        title: 'エラーが発生しました',
        message: '予期しないエラーが発生しました。ページを再読み込みしてください。',
        actionable: true,
        actions: [{ label: '再読み込み', action: 'reload' }],
        severity: 'error',
      });
    }
  }

  // ========================================
  // SEARCH FUNCTIONALITY
  // ========================================

  setSearchQuery(query: string): void {
    this.setState({ searchQuery: query });

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchClear = document.querySelector('.search-clear') as HTMLElement;

    if (searchInput && searchInput.value !== query) {
      searchInput.value = query;
    }

    if (searchClear) {
      searchClear.hidden = !query.trim();
    }
  }

  clearSearch(): void {
    this.setSearchQuery('');
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private initializeElements(): StateDisplayElements {
    const elements = {
      loading: document.getElementById('loading-state'),
      error: document.getElementById('error-state'),
      empty: document.getElementById('empty-state'),
      success: document.getElementById('success-state'),
      content: document.getElementById('content-container'),
    };

    // Validate all elements exist
    for (const [key, element] of Object.entries(elements)) {
      if (!element) {
        throw new Error(`Required element not found: ${key}-state`);
      }
    }

    return elements as StateDisplayElements;
  }

  private setupEventListeners(): void {
    // Search input handling
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.setSearchQuery(target.value);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.clearSearch();
          searchInput.blur();
        }
      });
    }

    // Search clear button
    const searchClear = document.querySelector('.search-clear') as HTMLElement;
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        this.clearSearch();
        searchInput?.focus();
      });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput?.focus();
      }

      // ? for help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.showKeyboardHelp();
      }

      // Escape to clear search or close modals
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });

    // Error action buttons
    this.elements.error.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      if (action) {
        this.handleErrorAction(action);
      }
    });
  }

  private updateDOM(previousState: UIState): void {
    // Hide all state displays
    Object.values(this.elements).forEach((element) => {
      element.hidden = true;
    });

    // Show current state
    const currentElement = this.elements[this.getElementKeyForState(this.state.currentView)];
    if (currentElement) {
      currentElement.hidden = false;

      // Announce state changes to screen readers
      this.announceStateChange(previousState.currentView, this.state.currentView);
    }

    // Update prompt count if showing content
    if (this.state.currentView === 'content' && this.state.data) {
      this.updatePromptCount();
    }
  }

  private getElementKeyForState(state: UIViewState): keyof StateDisplayElements {
    switch (state) {
      case 'loading':
        return 'loading';
      case 'error':
        return 'error';
      case 'empty':
        return 'empty';
      case 'success':
        return 'success';
      case 'content':
        return 'content';
      default:
        return 'content';
    }
  }

  private updateErrorDisplay(error: UserErrorInfo): void {
    const errorTitle = this.elements.error.querySelector('#error-title');
    const errorMessage = this.elements.error.querySelector('#error-message');
    const errorActions = this.elements.error.querySelector('#error-actions');

    if (errorTitle) errorTitle.textContent = error.title;
    if (errorMessage) errorMessage.textContent = error.message;

    if (errorActions && error.actionable && error.actions) {
      errorActions.innerHTML = '';

      error.actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = action.action === 'retry' ? 'primary-button' : 'secondary-button';
        button.textContent = action.label;
        button.dataset.action = action.action;
        errorActions.appendChild(button);
      });
    }
  }

  private updatePromptCount(): void {
    const promptCount = document.getElementById('prompt-count');
    if (promptCount && this.state.data?.length !== undefined) {
      const count = this.state.data.length;
      const filteredCount = this.state.searchQuery ? this.getFilteredPromptCount() : count;

      if (this.state.searchQuery) {
        promptCount.textContent = `${filteredCount}件見つかりました (全${count}件中)`;
      } else {
        promptCount.textContent = `${count}件のプロンプト`;
      }
    }
  }

  private getFilteredPromptCount(): number {
    if (!this.state.data || !this.state.searchQuery) return 0;

    const query = this.state.searchQuery.toLowerCase();
    return this.state.data.filter(
      (prompt: any) =>
        prompt.title?.toLowerCase().includes(query) ||
        prompt.content?.toLowerCase().includes(query) ||
        prompt.tags?.some((tag: string) => tag.toLowerCase().includes(query))
    ).length;
  }

  private announceStateChange(previousState: UIViewState, currentState: UIViewState): void {
    if (previousState === currentState) return;

    const announcements: Record<UIViewState, string> = {
      loading: 'プロンプトを読み込み中です',
      empty: 'プロンプトがありません',
      content: 'プロンプト一覧を表示しています',
      error: 'エラーが発生しました',
      success: '操作が完了しました',
    };

    const announcement = announcements[currentState];
    if (announcement) {
      // Create or update live region for screen reader announcements
      let liveRegion = document.getElementById('sr-live-region');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-live-region';
        liveRegion.className = 'visually-hidden';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(liveRegion);
      }

      // Set announcement immediately for better accessibility
      liveRegion.textContent = announcement;
    }
  }

  private showKeyboardHelp(): void {
    const keyboardHelp = document.getElementById('keyboard-help');
    if (keyboardHelp) {
      keyboardHelp.hidden = false;

      // Focus first focusable element in help
      const closeButton = keyboardHelp.querySelector('.help-close') as HTMLElement;
      closeButton?.focus();
    }
  }

  private hideKeyboardHelp(): void {
    const keyboardHelp = document.getElementById('keyboard-help');
    if (keyboardHelp) {
      keyboardHelp.hidden = true;
    }
  }

  private handleEscape(): void {
    const keyboardHelp = document.getElementById('keyboard-help');
    const searchInput = document.getElementById('search-input') as HTMLInputElement;

    // Close keyboard help if open
    if (keyboardHelp && !keyboardHelp.hidden) {
      this.hideKeyboardHelp();
      return;
    }

    // Clear search if there's a query
    if (this.state.searchQuery) {
      this.clearSearch();
      searchInput?.blur();
      return;
    }
  }

  private handleErrorAction(action: string): void {
    switch (action) {
      case 'retry':
        // Emit custom event for retry
        window.dispatchEvent(new CustomEvent('popup:retry'));
        break;

      case 'reload':
        window.location.reload();
        break;

      case 'cleanup':
        // Emit custom event for data cleanup
        window.dispatchEvent(new CustomEvent('popup:cleanup'));
        break;

      case 'settings':
        // Emit custom event to open settings
        window.dispatchEvent(new CustomEvent('popup:settings'));
        break;

      case 'permissions':
        // Open Chrome extension permissions
        if (chrome?.runtime?.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        break;

      default:
        console.warn(`Unknown error action: ${action}`);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
}

// Global functions for HTML onclick handlers
(window as any).createPrompt = () => {
  window.dispatchEvent(new CustomEvent('popup:create-prompt'));
};

(window as any).openSettings = () => {
  window.dispatchEvent(new CustomEvent('popup:settings'));
};

(window as any).hideKeyboardHelp = () => {
  const keyboardHelp = document.getElementById('keyboard-help');
  if (keyboardHelp) {
    keyboardHelp.hidden = true;
  }
};
