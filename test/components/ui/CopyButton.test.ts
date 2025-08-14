// CopyButton Component Test Suite
// TASK-0014: ワンクリックコピー機能UI実装

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopyButton, type CopyButtonProps } from '../../../src/components/ui/CopyButton';

// Mock DOM environment
const setupMockDOM = (): void => {
  document.body.innerHTML = `
    <div id="test-container"></div>
  `;
};

describe('CopyButton', () => {
  let container: HTMLElement;
  let mockOnCopy: ReturnType<typeof vi.fn>;
  let defaultProps: CopyButtonProps;

  beforeEach(() => {
    setupMockDOM();
    container = document.getElementById('test-container')!;
    
    mockOnCopy = vi.fn().mockResolvedValue(undefined);
    defaultProps = {
      promptId: 'test-prompt-1',
      onCopy: mockOnCopy,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('REQ-COPY-001: コピーボタンUI', () => {
    it('should render copy button with default variant', () => {
      // 🟢 Blue: Basic copy button rendering
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      expect(element).toBeTruthy();
      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toContain('copy-button');
      expect(element.className).toContain('copy-button--default');
      expect(element.className).toContain('copy-button--idle');
      expect(element.getAttribute('data-prompt-id')).toBe('test-prompt-1');
      expect(element.getAttribute('aria-label')).toBe('プロンプトをクリップボードにコピー');
    });

    it('should render compact variant', () => {
      // 🟡 Yellow: Variant rendering
      const compactProps: CopyButtonProps = {
        ...defaultProps,
        variant: 'compact',
      };
      
      const copyButton = new CopyButton(compactProps);
      const element = copyButton.getElement();

      expect(element.className).toContain('copy-button--compact');
    });

    it('should handle disabled state', () => {
      // 🟡 Yellow: Disabled state handling
      const disabledProps: CopyButtonProps = {
        ...defaultProps,
        disabled: true,
      };

      const copyButton = new CopyButton(disabledProps);
      const element = copyButton.getElement();

      expect(element.disabled).toBe(true);
    });

    it('should render default copy icon', () => {
      // 🟢 Blue: Icon rendering
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      const svg = element.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.classList.contains('copy-icon--default')).toBe(true);
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('REQ-COPY-002: 視覚的フィードバック', () => {
    it('should show loading state during copy', async () => {
      // 🟢 Blue: Loading state feedback
      let resolvePromise: () => void;
      const copyPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      mockOnCopy.mockReturnValue(copyPromise);

      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger copy
      element.click();

      // Check loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(copyButton.getState()).toBe('copying');
      expect(element.className).toContain('copy-button--copying');
      
      const loadingIcon = element.querySelector('.copy-icon--loading');
      expect(loadingIcon).toBeTruthy();

      // Resolve promise
      resolvePromise!();
      await copyPromise;
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check success state
      expect(copyButton.getState()).toBe('success');
    });

    it('should show success state after successful copy', async () => {
      // 🟢 Blue: Success state feedback
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger copy
      element.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(copyButton.getState()).toBe('success');
      expect(element.className).toContain('copy-button--success');
      
      const successIcon = element.querySelector('.copy-icon--success');
      expect(successIcon).toBeTruthy();
      expect(element.getAttribute('aria-label')).toBe('プロンプトをコピーしました');
    });

    it('should show error state after failed copy', async () => {
      // 🟡 Yellow: Error state feedback
      mockOnCopy.mockRejectedValue(new Error('Copy failed'));

      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger copy
      element.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(copyButton.getState()).toBe('error');
      expect(element.className).toContain('copy-button--error');
      
      const errorIcon = element.querySelector('.copy-icon--error');
      expect(errorIcon).toBeTruthy();
      expect(element.getAttribute('aria-label')).toBe('プロンプトのコピーに失敗しました');
    });

    it('should reset to idle state after timeout', async () => {
      // 🟡 Yellow: State reset functionality
      vi.useFakeTimers();

      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger successful copy
      element.click();
      await Promise.resolve(); // Let the click handler run
      expect(copyButton.getState()).toBe('success');

      // Fast-forward time to trigger the state reset
      vi.advanceTimersByTime(2000);
      expect(copyButton.getState()).toBe('idle');

      vi.useRealTimers();
    });
  });

  describe('REQ-COPY-004: キーボードナビゲーション', () => {
    it('should handle Enter key', async () => {
      // 🟢 Blue: Enter key support
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      element.dispatchEvent(enterEvent);

      // Wait for the async copy operation to complete
      await vi.waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledWith('test-prompt-1');
      }, { timeout: 1000 });
    });

    it('should handle Space key', async () => {
      // 🟢 Blue: Space key support
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      element.dispatchEvent(spaceEvent);

      // Wait for the async copy operation to complete
      await vi.waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledWith('test-prompt-1');
      }, { timeout: 1000 });
    });

    it('should not trigger on other keys', () => {
      // 🟡 Yellow: Key filtering
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      element.dispatchEvent(tabEvent);

      expect(mockOnCopy).not.toHaveBeenCalled();
    });

    it('should be focusable', () => {
      // 🟡 Yellow: Focus management
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();
      container.appendChild(element);

      element.focus();
      expect(document.activeElement).toBe(element);
    });
  });

  describe('Component Lifecycle', () => {
    it('should prevent multiple simultaneous copies', async () => {
      // 🔴 Red: Concurrency protection
      let resolveFirstCopy: () => void;
      const firstCopyPromise = new Promise<void>((resolve) => {
        resolveFirstCopy = resolve;
      });

      mockOnCopy.mockReturnValueOnce(firstCopyPromise);

      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger first copy
      element.click();
      await vi.waitFor(() => {
        expect(copyButton.getState()).toBe('copying');
      }, { timeout: 500 });

      // Try to trigger second copy while first is in progress
      element.click();
      
      // Should still be in copying state, not trigger second copy
      expect(mockOnCopy).toHaveBeenCalledTimes(1);
      expect(copyButton.getState()).toBe('copying');

      // Resolve first copy
      resolveFirstCopy!();
      await firstCopyPromise;
    });

    it('should not copy when disabled', () => {
      // 🟡 Yellow: Disabled state protection
      const copyButton = new CopyButton({
        ...defaultProps,
        disabled: true,
      });
      const element = copyButton.getElement();

      element.click();

      expect(mockOnCopy).not.toHaveBeenCalled();
      expect(copyButton.getState()).toBe('idle');
    });

    it('should update props correctly', () => {
      // 🟡 Yellow: Props update functionality
      const copyButton = new CopyButton(defaultProps);
      
      copyButton.updateProps({
        promptId: 'updated-prompt-id',
        disabled: true,
      });

      const element = copyButton.getElement();
      expect(element.getAttribute('data-prompt-id')).toBe('updated-prompt-id');
      expect(element.disabled).toBe(true);
    });

    it('should cleanup resources on destroy', () => {
      // 🔴 Red: Memory leak prevention
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();
      container.appendChild(element);

      expect(container.contains(element)).toBe(true);

      copyButton.destroy();
      
      expect(container.contains(element)).toBe(false);
    });

    it('should reset state on manual reset', () => {
      // 🟡 Yellow: Manual state reset
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Trigger copy to change state
      element.click();
      // Manually reset before completion
      copyButton.reset();

      expect(copyButton.getState()).toBe('idle');
      expect(element.className).toContain('copy-button--idle');
    });
  });

  describe('Factory Method', () => {
    it('should create instance using static factory method', () => {
      // 🟡 Yellow: Factory method functionality
      const copyButton = CopyButton.create(defaultProps);
      
      expect(copyButton).toBeInstanceOf(CopyButton);
      expect(copyButton.getState()).toBe('idle');

      const element = copyButton.getElement();
      expect(element.getAttribute('data-prompt-id')).toBe('test-prompt-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive clicks', async () => {
      // 🔴 Red: Rapid click protection
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      // Rapid clicks
      element.click();
      element.click();
      element.click();

      await vi.waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('should handle onCopy promise rejection', async () => {
      // 🔴 Red: Error handling
      const error = new Error('Network error');
      mockOnCopy.mockRejectedValue(error);

      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();

      element.click();
      await vi.waitFor(() => {
        expect(copyButton.getState()).toBe('error');
      }, { timeout: 500 });
    });

    it('should handle empty promptId', () => {
      // 🔴 Red: Invalid input handling
      const invalidProps: CopyButtonProps = {
        ...defaultProps,
        promptId: '',
      };

      const copyButton = new CopyButton(invalidProps);
      const element = copyButton.getElement();

      expect(element.getAttribute('data-prompt-id')).toBe('');
    });

    it('should handle click event propagation', () => {
      // 🟡 Yellow: Event propagation control
      const copyButton = new CopyButton(defaultProps);
      const element = copyButton.getElement();
      
      let parentClickTriggered = false;
      const parent = document.createElement('div');
      parent.addEventListener('click', () => {
        parentClickTriggered = true;
      });
      parent.appendChild(element);

      element.click();

      // Click should be stopped from propagating to parent
      expect(parentClickTriggered).toBe(false);
    });
  });
});

describe('CopyButton CSS Styles Helper', () => {
  it('should generate valid CSS styles', async () => {
    // 🟡 Yellow: CSS generation utility
    const { getCopyButtonStyles } = await import('../../../src/components/ui/CopyButton');
    const styles = getCopyButtonStyles();

    expect(typeof styles).toBe('string');
    expect(styles).toContain('.copy-button');
    expect(styles).toContain('.copy-button--success');
    expect(styles).toContain('.copy-button--error');
    expect(styles).toContain('.copy-button--copying');
    expect(styles).toContain('@keyframes');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});