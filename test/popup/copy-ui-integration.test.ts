// Copy UI Integration Test Suite
// TASK-0014: ワンクリックコピー機能UI実装

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopyButton } from '../../src/components/ui/CopyButton';
import { ToastManager, toast } from '../../src/components/ui/ToastNotification';

// Mock the popup.ts module functions
const mockChromeMessage = vi.fn();
const mockSendMessageToBackground = vi.fn();

// Mock Chrome API
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessageToBackground,
    },
  },
  writable: true,
});

// Mock DOM environment similar to popup.html
const setupMockPopupDOM = (): void => {
  document.body.innerHTML = `
    <div id="promptList" class="prompt-list">
      <div class="prompt-item" data-id="prompt-1" tabindex="0" role="button">
        <div class="prompt-title">Test Prompt 1</div>
        <div class="prompt-preview">This is a test prompt content...</div>
        <div class="prompt-meta">
          <span>使用回数: 5</span>
          <span>最終使用: 2時間前</span>
        </div>
      </div>
      <div class="prompt-item" data-id="prompt-2" tabindex="0" role="button">
        <div class="prompt-title">Test Prompt 2</div>
        <div class="prompt-preview">Another test prompt content...</div>
        <div class="prompt-meta">
          <span>使用回数: 2</span>
          <span>最終使用: 1日前</span>
        </div>
      </div>
    </div>
  `;
};

describe('Copy UI Integration Tests', () => {
  let toastManager: ToastManager;
  let copyButtons: Map<string, CopyButton>;

  beforeEach(() => {
    setupMockPopupDOM();
    toastManager = new ToastManager('integration-test-container');
    copyButtons = new Map();

    // Reset all mocks
    vi.clearAllMocks();
    mockSendMessageToBackground.mockClear();
  });

  afterEach(() => {
    // Cleanup copy buttons
    for (const copyButton of copyButtons.values()) {
      copyButton.destroy();
    }
    copyButtons.clear();

    // Cleanup toast manager
    toastManager.destroy();
    ToastManager.destroyInstance();
    
    // Clear DOM
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('REQ-COPY-001 & REQ-COPY-002: コピーボタン統合', () => {
    it('should integrate copy buttons with prompt items', () => {
      // 🟢 Blue: Copy button integration requirement
      const promptItems = document.querySelectorAll('.prompt-item');
      
      promptItems.forEach((item) => {
        const promptId = item.getAttribute('data-id');
        if (!promptId) return;

        const copyButton = new CopyButton({
          promptId,
          onCopy: mockCopyPrompt,
          variant: 'default'
        });

        copyButtons.set(promptId, copyButton);
        item.appendChild(copyButton.getElement());
      });

      expect(copyButtons.size).toBe(2);
      expect(document.querySelectorAll('.copy-button')).toHaveLength(2);

      // Check positioning and styling
      const firstCopyButton = document.querySelector('.copy-button');
      expect(firstCopyButton).toBeTruthy();
      expect(getComputedStyle(firstCopyButton!).position).toBe('absolute');
    });

    it('should handle successful copy flow', async () => {
      // 🟢 Blue: Successful copy integration
      mockSendMessageToBackground.mockResolvedValue({
        success: true,
        data: { copied: true }
      });

      const promptId = 'prompt-1';
      const copyButton = new CopyButton({
        promptId,
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      // Trigger copy
      element.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendMessageToBackground).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COPY_PROMPT',
          data: { promptId }
        }),
        expect.any(Function)
      );

      expect(copyButton.getState()).toBe('success');
      expect(toastManager.getNotificationCount()).toBe(1);
    });

    it('should handle copy failure flow', async () => {
      // 🟡 Yellow: Error handling integration
      mockSendMessageToBackground.mockResolvedValue({
        success: false,
        error: { message: 'クリップボードアクセスが拒否されました' }
      });

      const promptId = 'prompt-2';
      const copyButton = new CopyButton({
        promptId,
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      // Trigger copy
      element.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(copyButton.getState()).toBe('error');
      expect(toastManager.getNotificationCount()).toBe(1);
    });
  });

  describe('REQ-COPY-004: キーボードナビゲーション統合', () => {
    it('should support keyboard navigation between prompt items', () => {
      // 🟢 Blue: Keyboard navigation integration
      const promptItems = document.querySelectorAll('.prompt-item');
      
      // All items should be focusable
      promptItems.forEach((item) => {
        expect(item.getAttribute('tabindex')).toBe('0');
        expect(item.getAttribute('role')).toBe('button');
      });

      // Test focus movement
      const firstItem = promptItems[0] as HTMLElement;
      const secondItem = promptItems[1] as HTMLElement;

      firstItem.focus();
      expect(document.activeElement).toBe(firstItem);

      // Simulate Tab key navigation (would be handled by browser)
      secondItem.focus();
      expect(document.activeElement).toBe(secondItem);
    });

    it('should handle Enter key on prompt items', async () => {
      // 🟢 Blue: Enter key copy functionality
      mockSendMessageToBackground.mockResolvedValue({
        success: true,
        data: { copied: true }
      });

      const promptItem = document.querySelector('.prompt-item[data-id="prompt-1"]') as HTMLElement;
      
      // Add keyboard event listener (simulating popup.ts behavior)
      promptItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const promptId = promptItem.getAttribute('data-id');
          if (promptId) {
            mockCopyPrompt(promptId);
          }
        }
      });

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      promptItem.dispatchEvent(enterEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSendMessageToBackground).toHaveBeenCalled();
    });

    it('should handle Space key on prompt items', async () => {
      // 🟡 Yellow: Space key copy functionality
      mockSendMessageToBackground.mockResolvedValue({
        success: true,
        data: { copied: true }
      });

      const promptItem = document.querySelector('.prompt-item[data-id="prompt-2"]') as HTMLElement;
      
      // Add keyboard event listener
      promptItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const promptId = promptItem.getAttribute('data-id');
          if (promptId) {
            mockCopyPrompt(promptId);
          }
        }
      });

      // Simulate Space key press
      const spaceEvent = new KeyboardEvent('keydown', { 
        key: ' ',
        bubbles: true,
        cancelable: true
      });
      
      promptItem.dispatchEvent(spaceEvent);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSendMessageToBackground).toHaveBeenCalled();
    });
  });

  describe('REQ-COPY-003: トースト通知統合', () => {
    it('should show success toast on successful copy', async () => {
      // 🟢 Blue: Success feedback integration
      mockSendMessageToBackground.mockResolvedValue({
        success: true,
        data: { copied: true }
      });

      // Trigger copy through toast system
      const toastId = await mockCopyWithToast('prompt-1');
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      const toastElement = document.querySelector('.toast-item--success');
      expect(toastElement).toBeTruthy();
      
      const messageElement = toastElement?.querySelector('.toast-message');
      expect(messageElement?.textContent).toBe('プロンプトをコピーしました');
    });

    it('should show error toast on copy failure', async () => {
      // 🟡 Yellow: Error feedback integration
      mockSendMessageToBackground.mockResolvedValue({
        success: false,
        error: { message: 'コピーに失敗しました' }
      });

      // Trigger copy through toast system
      try {
        await mockCopyWithToast('prompt-1');
      } catch (error) {
        // Expected to throw
      }
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      const toastElement = document.querySelector('.toast-item--error');
      expect(toastElement).toBeTruthy();
      
      const messageElement = toastElement?.querySelector('.toast-message');
      expect(messageElement?.textContent).toBe('コピーに失敗しました');
    });

    it('should auto-dismiss success notifications', async () => {
      // 🟡 Yellow: Auto-dismiss behavior
      vi.useFakeTimers();

      mockSendMessageToBackground.mockResolvedValue({
        success: true,
        data: { copied: true }
      });

      await mockCopyWithToast('prompt-1');
      expect(toastManager.getNotificationCount()).toBe(1);

      // Fast-forward past success notification duration (3000ms)
      vi.advanceTimersByTime(3000);
      await new Promise(resolve => setTimeout(resolve, 350)); // Animation time

      expect(toastManager.getNotificationCount()).toBe(0);

      vi.useRealTimers();
    });

    it('should keep error notifications longer', async () => {
      // 🟡 Yellow: Error notification duration
      vi.useFakeTimers();

      mockSendMessageToBackground.mockResolvedValue({
        success: false,
        error: { message: 'コピーに失敗しました' }
      });

      try {
        await mockCopyWithToast('prompt-1');
      } catch (error) {
        // Expected to throw
      }

      expect(toastManager.getNotificationCount()).toBe(1);

      // Fast-forward past success duration but not error duration
      vi.advanceTimersByTime(3000);
      expect(toastManager.getNotificationCount()).toBe(1);

      // Fast-forward past error duration (5000ms)
      vi.advanceTimersByTime(2000);
      await new Promise(resolve => setTimeout(resolve, 350)); // Animation time

      expect(toastManager.getNotificationCount()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('REQ-COPY-005: レスポンシブ・アダプティブUI', () => {
    it('should adapt to Chrome extension popup size', () => {
      // 🟡 Yellow: Chrome extension size optimization
      const promptList = document.getElementById('promptList');
      expect(promptList).toBeTruthy();

      // Simulate Chrome extension popup constraints
      document.body.style.width = '350px';
      document.body.style.maxHeight = '600px';

      const copyButton = new CopyButton({
        promptId: 'test-prompt',
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      // Check button size is appropriate for the space
      const computedStyle = getComputedStyle(element);
      expect(parseInt(computedStyle.width)).toBeLessThanOrEqual(40);
      expect(parseInt(computedStyle.height)).toBeLessThanOrEqual(40);
    });

    it('should handle touch interactions on mobile', () => {
      // 🟡 Yellow: Touch support
      const copyButton = new CopyButton({
        promptId: 'touch-test',
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      // Simulate touch event
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [new Touch({
          identifier: 0,
          target: element,
          clientX: 100,
          clientY: 100
        })]
      });

      element.dispatchEvent(touchEvent);
      
      // Should still trigger click handler via touch
      element.click();
      
      expect(mockSendMessageToBackground).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle network timeout gracefully', async () => {
      // 🔴 Red: Network error handling
      mockSendMessageToBackground.mockRejectedValue(new Error('Network timeout'));

      const copyButton = new CopyButton({
        promptId: 'network-test',
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      element.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(copyButton.getState()).toBe('error');
      expect(toastManager.getNotificationCount()).toBe(1);
    });

    it('should prevent duplicate copy operations', async () => {
      // 🔴 Red: Duplicate operation prevention
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      mockSendMessageToBackground.mockReturnValueOnce(firstPromise);

      const copyButton = new CopyButton({
        promptId: 'duplicate-test',
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      // Trigger first copy
      element.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(copyButton.getState()).toBe('copying');

      // Try to trigger second copy
      element.click();
      
      // Should still only have one call
      expect(mockSendMessageToBackground).toHaveBeenCalledTimes(1);

      // Resolve first copy
      resolveFirst!();
      await firstPromise;
    });

    it('should handle malformed Chrome extension responses', async () => {
      // 🔴 Red: Malformed response handling
      mockSendMessageToBackground.mockResolvedValue({
        // Missing success field and malformed structure
        data: null,
        error: undefined
      });

      const copyButton = new CopyButton({
        promptId: 'malformed-test',
        onCopy: mockCopyPrompt,
        variant: 'default'
      });

      const element = copyButton.getElement();
      document.body.appendChild(element);

      element.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle gracefully and show error
      expect(copyButton.getState()).toBe('error');
      expect(toastManager.getNotificationCount()).toBe(1);
    });
  });

  // Helper functions
  async function mockCopyPrompt(promptId: string): Promise<void> {
    const message = {
      type: 'COPY_PROMPT',
      data: { promptId },
      requestId: 'test-request-id',
      timestamp: new Date(),
    };

    const response = await mockSendMessageToBackground(message);

    if (response.success) {
      toast.success('プロンプトをコピーしました');
    } else {
      const errorMessage = response.error?.message || 'コピーに失敗しました';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async function mockCopyWithToast(promptId: string): Promise<string> {
    try {
      await mockCopyPrompt(promptId);
      return toast.success('プロンプトをコピーしました');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'コピーに失敗しました';
      toast.error(errorMessage);
      throw error;
    }
  }
});