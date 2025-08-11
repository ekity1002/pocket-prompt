// Toast Notification System Test Suite
// TASK-0014: ワンクリックコピー機能UI実装

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ToastManager, toast } from '../../../src/components/ui/ToastNotification';

// Mock DOM environment
const setupMockDOM = (): void => {
  document.body.innerHTML = '';
};

describe('ToastManager', () => {
  let toastManager: ToastManager;

  beforeEach(() => {
    setupMockDOM();
    toastManager = new ToastManager('test-toast-container');
  });

  afterEach(() => {
    vi.clearAllMocks();
    toastManager.destroy();
    document.body.innerHTML = '';
  });

  describe('REQ-COPY-003: トースト通知システム', () => {
    it('should create toast container on initialization', () => {
      // 🟢 Blue: Container creation requirement
      const container = document.getElementById('test-toast-container');
      
      expect(container).toBeTruthy();
      expect(container?.className).toBe('toast-container');
      expect(container?.getAttribute('role')).toBe('status');
      expect(container?.getAttribute('aria-live')).toBe('polite');
      expect(container?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should show success notification', () => {
      // 🟢 Blue: Success notification requirement
      const toastId = toastManager.showSuccess('Test success message', 1000);
      
      expect(typeof toastId).toBe('string');
      expect(toastId.startsWith('toast-')).toBe(true);
      expect(toastManager.getNotificationCount()).toBe(1);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      expect(toastElement).toBeTruthy();
      expect(toastElement?.classList.contains('toast-item--success')).toBe(true);
    });

    it('should show error notification', () => {
      // 🟢 Blue: Error notification requirement
      const toastId = toastManager.showError('Test error message', 2000);
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      expect(toastElement).toBeTruthy();
      expect(toastElement?.classList.contains('toast-item--error')).toBe(true);
    });

    it('should show info notification', () => {
      // 🟡 Yellow: Info notification support
      const toastId = toastManager.showInfo('Test info message');
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      expect(toastElement).toBeTruthy();
      expect(toastElement?.classList.contains('toast-item--info')).toBe(false); // Should be default styling
    });

    it('should render correct notification content', () => {
      // 🟢 Blue: Content rendering requirement
      const message = 'Test notification message';
      const toastId = toastManager.showSuccess(message);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      const messageElement = toastElement?.querySelector('.toast-message');
      
      expect(messageElement?.textContent).toBe(message);
      
      // Check for icon
      const iconElement = toastElement?.querySelector('.toast-icon svg');
      expect(iconElement).toBeTruthy();
      
      // Check for close button
      const closeButton = toastElement?.querySelector('.toast-close');
      expect(closeButton).toBeTruthy();
      expect(closeButton?.getAttribute('aria-label')).toBe('通知を閉じる');
    });

    it('should auto-dismiss notifications after duration', async () => {
      // 🟡 Yellow: Auto-dismiss functionality
      vi.useFakeTimers();
      
      const toastId = toastManager.showSuccess('Test message', 1000);
      expect(toastManager.getNotificationCount()).toBe(1);
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 350)); // Animation duration
      
      expect(toastManager.getNotificationCount()).toBe(0);
      
      vi.useRealTimers();
    });

    it('should not auto-dismiss persistent notifications', () => {
      // 🟡 Yellow: Persistent notification support
      vi.useFakeTimers();
      
      const toastId = toastManager.show('Persistent message', { 
        persistent: true,
        duration: 1000
      });
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      // Fast-forward time beyond duration
      vi.advanceTimersByTime(2000);
      
      expect(toastManager.getNotificationCount()).toBe(1);
      
      vi.useRealTimers();
    });

    it('should manually dismiss notifications', () => {
      // 🟢 Blue: Manual dismiss requirement
      const toastId = toastManager.showSuccess('Test message');
      expect(toastManager.getNotificationCount()).toBe(1);
      
      toastManager.dismiss(toastId);
      
      // Should immediately start exit animation
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      expect(toastElement?.classList.contains('toast-item--exiting')).toBe(true);
    });

    it('should dismiss all notifications', () => {
      // 🟡 Yellow: Dismiss all functionality
      toastManager.showSuccess('Message 1');
      toastManager.showError('Message 2');
      toastManager.showInfo('Message 3');
      
      expect(toastManager.getNotificationCount()).toBe(3);
      
      toastManager.dismissAll();
      
      // All should start exiting
      const allToasts = document.querySelectorAll('.toast-item');
      allToasts.forEach(toast => {
        expect(toast.classList.contains('toast-item--exiting')).toBe(true);
      });
    });

    it('should enforce maximum notification limit', () => {
      // 🔴 Red: Maximum notification enforcement
      // Create more than max notifications (5)
      for (let i = 0; i < 7; i++) {
        toastManager.show(`Message ${i}`);
      }
      
      expect(toastManager.getNotificationCount()).toBeLessThanOrEqual(5);
    });

    it('should handle close button clicks', () => {
      // 🟡 Yellow: Close button interaction
      const toastId = toastManager.showSuccess('Test message');
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      const closeButton = toastElement?.querySelector('.toast-close') as HTMLButtonElement;
      
      expect(closeButton).toBeTruthy();
      
      closeButton.click();
      
      expect(toastElement?.classList.contains('toast-item--exiting')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // 🟡 Yellow: ARIA compliance
      const toastId = toastManager.showError('Error message');
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      
      expect(toastElement?.getAttribute('role')).toBe('alert');
      expect(toastElement?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should escape HTML in messages', () => {
      // 🔴 Red: XSS protection
      const maliciousMessage = '<script>alert("XSS")</script>';
      const toastId = toastManager.showSuccess(maliciousMessage);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      const messageElement = toastElement?.querySelector('.toast-message');
      
      expect(messageElement?.innerHTML).toContain('&lt;script&gt;');
      expect(messageElement?.innerHTML).not.toContain('<script>');
    });

    it('should render progress bar for timed notifications', () => {
      // 🟡 Yellow: Progress indication
      const toastId = toastManager.showSuccess('Test message', 3000);
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      const progressBar = toastElement?.querySelector('.toast-progress-bar');
      
      expect(progressBar).toBeTruthy();
      expect(progressBar?.getAttribute('style')).toContain('animation-duration: 3000ms');
    });

    it('should not render progress bar for persistent notifications', () => {
      // 🟡 Yellow: No progress for persistent
      const toastId = toastManager.show('Persistent message', { 
        persistent: true 
      });
      
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      const progressContainer = toastElement?.querySelector('.toast-progress');
      
      expect(progressContainer).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent notification dismissal', () => {
      // 🔴 Red: Graceful error handling
      expect(() => {
        toastManager.dismiss('non-existent-id');
      }).not.toThrow();
    });

    it('should handle malformed notification data', () => {
      // 🔴 Red: Invalid data handling
      expect(() => {
        toastManager.show('', { duration: -1 });
      }).not.toThrow();
      
      expect(toastManager.getNotificationCount()).toBe(1);
    });

    it('should cleanup on destroy', () => {
      // 🔴 Red: Memory leak prevention
      toastManager.showSuccess('Message 1');
      toastManager.showError('Message 2');
      
      expect(toastManager.getNotificationCount()).toBe(2);
      
      toastManager.destroy();
      
      const container = document.getElementById('test-toast-container');
      expect(container).toBeFalsy();
      expect(toastManager.getNotificationCount()).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getInstance', () => {
      // 🟡 Yellow: Singleton behavior
      const instance1 = ToastManager.getInstance();
      const instance2 = ToastManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after destroyInstance', () => {
      // 🟡 Yellow: Instance recreation
      const instance1 = ToastManager.getInstance();
      ToastManager.destroyInstance();
      const instance2 = ToastManager.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});

describe('Toast Convenience Functions', () => {
  beforeEach(() => {
    setupMockDOM();
  });

  afterEach(() => {
    ToastManager.destroyInstance();
    document.body.innerHTML = '';
  });

  describe('Global Toast Functions', () => {
    it('should use singleton instance for success', () => {
      // 🟡 Yellow: Convenience function testing
      const toastId = toast.success('Success message');
      
      expect(typeof toastId).toBe('string');
      
      const manager = ToastManager.getInstance();
      expect(manager.getNotificationCount()).toBe(1);
    });

    it('should use singleton instance for error', () => {
      // 🟡 Yellow: Convenience function testing
      const toastId = toast.error('Error message');
      
      expect(typeof toastId).toBe('string');
      
      const manager = ToastManager.getInstance();
      expect(manager.getNotificationCount()).toBe(1);
    });

    it('should use singleton instance for info', () => {
      // 🟡 Yellow: Convenience function testing
      const toastId = toast.info('Info message');
      
      expect(typeof toastId).toBe('string');
      
      const manager = ToastManager.getInstance();
      expect(manager.getNotificationCount()).toBe(1);
    });

    it('should dismiss specific toast', () => {
      // 🟡 Yellow: Convenience dismiss function
      const toastId = toast.success('Success message');
      
      const manager = ToastManager.getInstance();
      expect(manager.getNotificationCount()).toBe(1);
      
      toast.dismiss(toastId);
      
      // Should start exit animation
      const toastElement = document.getElementById(`toast-${toastId.split('-').slice(1).join('-')}`);
      expect(toastElement?.classList.contains('toast-item--exiting')).toBe(true);
    });

    it('should dismiss all toasts', () => {
      // 🟡 Yellow: Convenience dismiss all function
      toast.success('Message 1');
      toast.error('Message 2');
      toast.info('Message 3');
      
      const manager = ToastManager.getInstance();
      expect(manager.getNotificationCount()).toBe(3);
      
      toast.dismissAll();
      
      const allToasts = document.querySelectorAll('.toast-item');
      allToasts.forEach(toastEl => {
        expect(toastEl.classList.contains('toast-item--exiting')).toBe(true);
      });
    });
  });
});

describe('Toast Styles Helper', () => {
  it('should generate valid CSS styles', () => {
    // 🟡 Yellow: CSS generation utility
    const { getToastStyles } = require('../../../src/components/ui/ToastNotification');
    const styles = getToastStyles();

    expect(typeof styles).toBe('string');
    expect(styles).toContain('.toast-container');
    expect(styles).toContain('.toast-item');
    expect(styles).toContain('.toast-item--success');
    expect(styles).toContain('.toast-item--error');
    expect(styles).toContain('@keyframes');
    expect(styles).toContain('@media (max-width: 480px)');
    expect(styles).toContain('@media (prefers-color-scheme: dark)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});