// PopupStateManager Test Suite
// TASK-0011: Popup UI State Management Tests

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PopupStateManager } from '../../src/popup/popup-state-manager';
import type { UIState, UIViewState } from '../../src/popup/popup-state-manager';
import type { UserErrorInfo } from '../../src/types';

// Mock DOM elements
const createMockElement = (id: string, className?: string): HTMLElement => {
  const element = document.createElement('div');
  element.id = id;
  if (className) element.className = className;
  element.hidden = true;
  return element;
};

const setupMockDOM = (): void => {
  // Clear document body
  document.body.innerHTML = '';
  
  // Create required elements
  const elements = [
    { id: 'loading-state', children: [{ className: 'loading-text', textContent: '' }] },
    { id: 'error-state', children: [
      { id: 'error-title', textContent: '' },
      { id: 'error-message', textContent: '' },
      { id: 'error-actions', innerHTML: '' },
    ]},
    { id: 'empty-state' },
    { id: 'success-state', children: [{ className: 'success-message', textContent: '' }] },
    { id: 'content-container' },
    { id: 'search-input', tagName: 'input', type: 'search' },
    { id: 'prompt-count', textContent: '' },
    { id: 'keyboard-help', hidden: true },
  ];

  elements.forEach(({ id, children, tagName = 'div', ...attrs }) => {
    const element = document.createElement(tagName);
    element.id = id;
    Object.assign(element, attrs);
    
    if (children) {
      children.forEach(child => {
        const childElement = document.createElement('div');
        Object.assign(childElement, child);
        element.appendChild(childElement);
      });
    }
    
    document.body.appendChild(element);
  });

  // Add search clear button
  const searchClear = document.createElement('button');
  searchClear.className = 'search-clear';
  searchClear.hidden = true;
  document.body.appendChild(searchClear);
};

// Mock ErrorManager
vi.mock('../../src/core/error-manager', () => ({
  ErrorManager: {
    logError: vi.fn(),
    handleUserError: vi.fn((error: Error): UserErrorInfo => ({
      title: 'テストエラー',
      message: error.message,
      actionable: true,
      actions: [{ label: '再試行', action: 'retry' }],
      severity: 'error',
    })),
  },
}));

describe('PopupStateManager', () => {
  let stateManager: PopupStateManager;

  beforeEach(() => {
    setupMockDOM();
    stateManager = new PopupStateManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('REQ-UI-001: 基本状態管理', () => {
    it('should initialize with loading state', () => {
      // 🟢 Blue: Initial state requirement
      const state = stateManager.getState();
      
      expect(state.currentView).toBe('loading');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.data).toBeNull();
      expect(state.searchQuery).toBe('');
    });

    it('should update state correctly', () => {
      // 🟢 Blue: State update functionality
      const newState = {
        currentView: 'content' as UIViewState,
        data: ['test', 'data'],
      };
      
      stateManager.setState(newState);
      const state = stateManager.getState();
      
      expect(state.currentView).toBe('content');
      expect(state.data).toEqual(['test', 'data']);
    });

    it('should notify listeners on state change', () => {
      // 🟢 Blue: Observer pattern requirement
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe(listener);
      
      stateManager.setState({ currentView: 'empty' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ currentView: 'empty' })
      );
      
      // Test unsubscribe
      unsubscribe();
      stateManager.setState({ currentView: 'content' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should return immutable state', () => {
      // 🟡 Yellow: Data integrity requirement
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();
      
      expect(state1).not.toBe(state2); // Different object references
      expect(state1).toEqual(state2);  // Same content
      
      // Modifying returned state should not affect internal state
      (state1 as any).currentView = 'modified';
      expect(stateManager.getState().currentView).not.toBe('modified');
    });
  });

  describe('REQ-UI-002: 状態表示システム', () => {
    it('should show loading state with custom message', () => {
      // 🟢 Blue: Loading state display requirement
      const customMessage = 'データを保存中...';
      stateManager.showLoading(customMessage);
      
      const state = stateManager.getState();
      const loadingElement = document.getElementById('loading-state');
      const loadingText = loadingElement?.querySelector('.loading-text');
      
      expect(state.currentView).toBe('loading');
      expect(state.isLoading).toBe(true);
      expect(loadingElement?.hidden).toBe(false);
      expect(loadingText?.textContent).toBe(customMessage);
    });

    it('should show error state with user-friendly error info', async () => {
      // 🟢 Blue: Error state display requirement
      const testError = new Error('Test error message');
      
      await stateManager.handleError(testError);
      
      const state = stateManager.getState();
      const errorElement = document.getElementById('error-state');
      const errorTitle = document.getElementById('error-title');
      const errorMessage = document.getElementById('error-message');
      
      expect(state.currentView).toBe('error');
      expect(state.error).toBeTruthy();
      expect(errorElement?.hidden).toBe(false);
      expect(errorTitle?.textContent).toBe('テストエラー');
      expect(errorMessage?.textContent).toBe('Test error message');
    });

    it('should show empty state', () => {
      // 🟢 Blue: Empty state display requirement
      stateManager.showEmpty();
      
      const state = stateManager.getState();
      const emptyElement = document.getElementById('empty-state');
      
      expect(state.currentView).toBe('empty');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.data).toBeNull();
      expect(emptyElement?.hidden).toBe(false);
    });

    it('should show content state with data', () => {
      // 🟢 Blue: Content state display requirement
      const testData = [{ id: 1, title: 'Test Prompt' }];
      stateManager.showContent(testData);
      
      const state = stateManager.getState();
      const contentElement = document.getElementById('content-container');
      
      expect(state.currentView).toBe('content');
      expect(state.data).toEqual(testData);
      expect(contentElement?.hidden).toBe(false);
    });

    it('should show success state with auto-hide', async () => {
      // 🟢 Blue: Success state display requirement
      const successMessage = 'プロンプトが保存されました';
      const testData = [{ id: 1, title: 'Test' }];
      
      // Set some content first
      stateManager.showContent(testData);
      
      // Show success with short duration for testing
      stateManager.showSuccess(successMessage, 100);
      
      const state = stateManager.getState();
      const successElement = document.getElementById('success-state');
      const successMessageElement = successElement?.querySelector('.success-message');
      
      expect(state.currentView).toBe('success');
      expect(successElement?.hidden).toBe(false);
      expect(successMessageElement?.textContent).toBe(successMessage);
      
      // Wait for auto-hide
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const finalState = stateManager.getState();
      expect(finalState.currentView).toBe('content');
    });

    it('should hide all states except current', () => {
      // 🟡 Yellow: State isolation requirement
      stateManager.showError({
        title: 'Test Error',
        message: 'Test message',
        actionable: false,
        actions: [],
        severity: 'error',
      });
      
      const allStates = [
        'loading-state',
        'empty-state', 
        'success-state',
        'content-container',
      ];
      
      allStates.forEach(stateId => {
        const element = document.getElementById(stateId);
        expect(element?.hidden).toBe(true);
      });
      
      const errorElement = document.getElementById('error-state');
      expect(errorElement?.hidden).toBe(false);
    });
  });

  describe('REQ-UI-003: 検索機能', () => {
    it('should update search query and toggle clear button', () => {
      // 🟢 Blue: Search functionality requirement
      const searchQuery = 'test query';
      stateManager.setSearchQuery(searchQuery);
      
      const state = stateManager.getState();
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      const searchClear = document.querySelector('.search-clear') as HTMLElement;
      
      expect(state.searchQuery).toBe(searchQuery);
      expect(searchInput.value).toBe(searchQuery);
      expect(searchClear.hidden).toBe(false);
    });

    it('should clear search query', () => {
      // 🟢 Blue: Search clear functionality
      stateManager.setSearchQuery('test query');
      stateManager.clearSearch();
      
      const state = stateManager.getState();
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      const searchClear = document.querySelector('.search-clear') as HTMLElement;
      
      expect(state.searchQuery).toBe('');
      expect(searchInput.value).toBe('');
      expect(searchClear.hidden).toBe(true);
    });

    it('should handle search input events', () => {
      // 🟡 Yellow: Event handling integration
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      
      // Simulate user typing
      searchInput.value = 'new query';
      searchInput.dispatchEvent(new Event('input'));
      
      const state = stateManager.getState();
      expect(state.searchQuery).toBe('new query');
    });

    it('should handle escape key to clear search', () => {
      // 🟡 Yellow: Keyboard interaction
      stateManager.setSearchQuery('test query');
      
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      searchInput.dispatchEvent(escapeEvent);
      
      const state = stateManager.getState();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('REQ-UI-004: キーボード操作', () => {
    it('should handle keyboard shortcuts', () => {
      // 🟢 Blue: Keyboard accessibility requirement
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      const focusSpy = vi.spyOn(searchInput, 'focus');
      
      // Test Ctrl+F for search focus
      const ctrlF = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true });
      document.dispatchEvent(ctrlF);
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should show keyboard help on ? key', () => {
      // 🟡 Yellow: Help system requirement
      const helpEvent = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(helpEvent);
      
      const keyboardHelp = document.getElementById('keyboard-help');
      expect(keyboardHelp?.hidden).toBe(false);
    });

    it('should handle escape key for modal closing', () => {
      // 🟡 Yellow: Modal interaction
      const keyboardHelp = document.getElementById('keyboard-help');
      keyboardHelp!.hidden = false;
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(keyboardHelp?.hidden).toBe(true);
    });
  });

  describe('REQ-UI-005: エラーアクション処理', () => {
    it('should handle error action buttons', () => {
      // 🟢 Blue: Error recovery requirement
      const retryListener = vi.fn();
      window.addEventListener('popup:retry', retryListener);
      
      const errorState: UserErrorInfo = {
        title: 'Test Error',
        message: 'Test message',
        actionable: true,
        actions: [{ label: '再試行', action: 'retry' }],
        severity: 'error',
      };
      
      stateManager.showError(errorState);
      
      // Simulate clicking retry button
      const errorActions = document.getElementById('error-actions');
      const retryButton = errorActions?.querySelector('[data-action="retry"]') as HTMLElement;
      
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent).toBe('再試行');
      
      retryButton.click();
      expect(retryListener).toHaveBeenCalled();
      
      window.removeEventListener('popup:retry', retryListener);
    });

    it('should handle different error action types', () => {
      // 🟡 Yellow: Comprehensive error handling
      const actionListeners: { [key: string]: any } = {
        'popup:cleanup': vi.fn(),
        'popup:settings': vi.fn(),
      };
      
      Object.entries(actionListeners).forEach(([event, listener]) => {
        window.addEventListener(event, listener);
      });
      
      const errorState: UserErrorInfo = {
        title: 'Storage Error',
        message: 'Storage full',
        actionable: true,
        actions: [
          { label: 'クリーンアップ', action: 'cleanup' },
          { label: '設定', action: 'settings' },
        ],
        severity: 'error',
      };
      
      stateManager.showError(errorState);
      
      const errorActions = document.getElementById('error-actions');
      const cleanupButton = errorActions?.querySelector('[data-action="cleanup"]') as HTMLElement;
      const settingsButton = errorActions?.querySelector('[data-action="settings"]') as HTMLElement;
      
      cleanupButton.click();
      settingsButton.click();
      
      expect(actionListeners['popup:cleanup']).toHaveBeenCalled();
      expect(actionListeners['popup:settings']).toHaveBeenCalled();
      
      // Cleanup
      Object.keys(actionListeners).forEach(event => {
        window.removeEventListener(event, actionListeners[event]);
      });
    });
  });

  describe('REQ-UI-006: アクセシビリティ', () => {
    it('should announce state changes to screen readers', () => {
      // 🟢 Blue: Screen reader support requirement
      // Test the announcement functionality directly
      const spy = vi.spyOn(document, 'createElement');
      
      // First call showLoading to trigger state change
      stateManager.showLoading('テストメッセージ');
      
      // Should have attempted to create live region
      expect(spy).toHaveBeenCalledWith('div');
      
      // Check that live region was created with proper attributes
      const liveRegion = document.getElementById('sr-live-region');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion?.textContent).toBe('プロンプトを読み込み中です');
      
      // Test another state change
      stateManager.showEmpty();
      expect(liveRegion?.textContent).toBe('プロンプトがありません');
      
      spy.mockRestore();
    });

    it('should maintain focus management', () => {
      // 🟡 Yellow: Focus management requirement
      const keyboardHelp = document.getElementById('keyboard-help');
      const closeButton = document.createElement('button');
      closeButton.className = 'help-close';
      keyboardHelp?.appendChild(closeButton);
      
      const focusSpy = vi.spyOn(closeButton, 'focus');
      
      // Simulate showing help
      const helpEvent = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(helpEvent);
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should update prompt count for screen readers', () => {
      // 🟡 Yellow: Dynamic content announcements
      const testData = [
        { title: 'Prompt 1' },
        { title: 'Prompt 2' },
        { title: 'Prompt 3' },
      ];
      
      stateManager.showContent(testData);
      
      const promptCount = document.getElementById('prompt-count');
      expect(promptCount?.textContent).toBe('3件のプロンプト');
      
      // Test filtered count
      stateManager.setSearchQuery('Prompt 1');
      expect(promptCount?.textContent).toContain('1件見つかりました');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      // 🔴 Red: Error resilience
      document.body.innerHTML = ''; // Remove all elements
      
      expect(() => {
        new PopupStateManager();
      }).toThrow('Required element not found');
    });

    it('should handle listener errors gracefully', () => {
      // 🟡 Yellow: Error resilience in callbacks
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      stateManager.subscribe(errorListener);
      stateManager.setState({ currentView: 'content' });
      
      // Should not throw, but should log error
      expect(consoleSpy).toHaveBeenCalledWith('Error in state listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle rapid state changes correctly', () => {
      // 🟡 Yellow: State consistency under load
      const listener = vi.fn();
      stateManager.subscribe(listener);
      
      // Rapid state changes
      stateManager.setState({ currentView: 'loading' });
      stateManager.setState({ currentView: 'content' });
      stateManager.setState({ currentView: 'empty' });
      
      expect(listener).toHaveBeenCalledTimes(3);
      expect(stateManager.getState().currentView).toBe('empty');
    });

    it('should handle custom events properly', () => {
      // 🟡 Yellow: Event system integration
      const createPromptListener = vi.fn();
      window.addEventListener('popup:create-prompt', createPromptListener);
      
      // Test global function
      (window as any).createPrompt();
      expect(createPromptListener).toHaveBeenCalled();
      
      window.removeEventListener('popup:create-prompt', createPromptListener);
    });
  });
});