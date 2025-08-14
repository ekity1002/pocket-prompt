// Toast Notification System
// TASK-0014: ワンクリックコピー機能UI実装

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration: number;
  timestamp: number;
}

export interface ToastOptions {
  type?: 'success' | 'error' | 'info';
  duration?: number;
  persistent?: boolean;
}

export class ToastManager {
  private container: HTMLDivElement;
  private notifications: Map<string, ToastNotification> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxNotifications = 5;

  constructor(containerId = 'toast-container') {
    this.container = this.createContainer(containerId);
    document.body.appendChild(this.container);
  }

  private createContainer(id: string): HTMLDivElement {
    const container = document.createElement('div');
    container.id = id;
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');

    return container;
  }

  public showSuccess(message: string, duration = 3000): string {
    return this.show(message, { type: 'success', duration });
  }

  public showError(message: string, duration = 5000): string {
    return this.show(message, { type: 'error', duration });
  }

  public showInfo(message: string, duration = 4000): string {
    return this.show(message, { type: 'info', duration });
  }

  public show(message: string, options: ToastOptions = {}): string {
    const { type = 'info', duration = 4000, persistent = false } = options;

    const id = this.generateId();
    const notification: ToastNotification = {
      id,
      type,
      message,
      duration,
      timestamp: Date.now(),
    };

    this.notifications.set(id, notification);
    this.renderNotification(notification);

    // Auto-dismiss unless persistent
    if (!persistent && duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timeouts.set(id, timeout);
    }

    // Manage maximum notifications
    this.enforceMaxNotifications();

    return id;
  }

  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const element = document.getElementById(`toast-${id}`);
    if (element) {
      // Add exit animation
      element.classList.add('toast-item--exiting');

      setTimeout(() => {
        element.remove();
        this.notifications.delete(id);

        const timeout = this.timeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          this.timeouts.delete(id);
        }
      }, 300); // Match CSS animation duration
    }
  }

  public dismissAll(): void {
    for (const id of this.notifications.keys()) {
      this.dismiss(id);
    }
  }

  private renderNotification(notification: ToastNotification): void {
    const element = this.createNotificationElement(notification);
    this.container.appendChild(element);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      element.classList.add('toast-item--visible');
    });
  }

  private createNotificationElement(notification: ToastNotification): HTMLDivElement {
    const element = document.createElement('div');
    element.id = `toast-${notification.id}`;
    element.className = `toast-item toast-item--${notification.type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', 'assertive');

    const iconHtml = this.getIconHtml(notification.type);
    const closeButtonHtml = this.getCloseButtonHtml(notification.id);

    element.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon" aria-hidden="true">
          ${iconHtml}
        </div>
        <div class="toast-message">
          ${this.escapeHtml(notification.message)}
        </div>
        ${closeButtonHtml}
      </div>
      ${this.getProgressBarHtml(notification)}
    `;

    // Add close button event listener
    const closeButton = element.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.dismiss(notification.id);
      });
    }

    return element;
  }

  private getIconHtml(type: string): string {
    switch (type) {
      case 'success':
        return `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      case 'error':
        return `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke-linecap="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke-linecap="round"/>
          </svg>
        `;
      default:
        return `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4" stroke-linecap="round"/>
            <path d="M12 8h.01" stroke-linecap="round"/>
          </svg>
        `;
    }
  }

  private getCloseButtonHtml(id: string): string {
    return `
      <button 
        class="toast-close" 
        type="button"
        aria-label="通知を閉じる"
        data-toast-id="${id}"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round"/>
        </svg>
      </button>
    `;
  }

  private getProgressBarHtml(notification: ToastNotification): string {
    if (notification.duration <= 0) return '';

    return `
      <div class="toast-progress">
        <div class="toast-progress-bar" style="animation-duration: ${notification.duration}ms"></div>
      </div>
    `;
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private enforceMaxNotifications(): void {
    const notificationArray = Array.from(this.notifications.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    while (notificationArray.length > this.maxNotifications) {
      const oldest = notificationArray.shift();
      if (oldest) {
        this.dismiss(oldest.id);
      }
    }
  }

  private escapeHtml(unsafe: string): string {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return unsafe.replace(/[&<>"']/g, (char) => replacements[char as keyof typeof replacements]);
  }

  public getNotificationCount(): number {
    return this.notifications.size;
  }

  public hasNotifications(): boolean {
    return this.notifications.size > 0;
  }

  public destroy(): void {
    this.dismissAll();
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  // Static instance for singleton pattern
  private static instance: ToastManager | null = null;

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  public static destroyInstance(): void {
    if (ToastManager.instance) {
      ToastManager.instance.destroy();
      ToastManager.instance = null;
    }
  }
}

// Convenience functions for global use
export const toast = {
  success: (message: string, duration?: number) =>
    ToastManager.getInstance().showSuccess(message, duration),

  error: (message: string, duration?: number) =>
    ToastManager.getInstance().showError(message, duration),

  info: (message: string, duration?: number) =>
    ToastManager.getInstance().showInfo(message, duration),

  dismiss: (id: string) => ToastManager.getInstance().dismiss(id),

  dismissAll: () => ToastManager.getInstance().dismissAll(),
};

// CSS-in-JS helper for dynamic styles
export function getToastStyles(): string {
  return `
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      max-width: 400px;
      pointer-events: none;
    }

    .toast-item {
      position: relative;
      margin-bottom: 12px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-in-out;
      pointer-events: auto;
      min-width: 300px;
    }

    .toast-item--visible {
      opacity: 1;
      transform: translateX(0);
    }

    .toast-item--exiting {
      opacity: 0;
      transform: translateX(100%);
      margin-bottom: 0;
      max-height: 0;
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      gap: 12px;
    }

    .toast-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .toast-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      word-wrap: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      transition: all 0.2s ease;
    }

    .toast-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #333;
    }

    .toast-close:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
    }

    /* Progress bar */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(0, 0, 0, 0.1);
    }

    .toast-progress-bar {
      height: 100%;
      background: currentColor;
      transform-origin: left;
      animation: toastProgress linear forwards;
    }

    @keyframes toastProgress {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }

    /* Toast types */
    .toast-item--success {
      border-left: 4px solid #4caf50;
    }

    .toast-item--success .toast-icon {
      color: #4caf50;
    }

    .toast-item--success .toast-progress-bar {
      background: #4caf50;
    }

    .toast-item--error {
      border-left: 4px solid #f44336;
    }

    .toast-item--error .toast-icon {
      color: #f44336;
    }

    .toast-item--error .toast-progress-bar {
      background: #f44336;
    }

    .toast-item--info {
      border-left: 4px solid #2196f3;
    }

    .toast-item--info .toast-icon {
      color: #2196f3;
    }

    .toast-item--info .toast-progress-bar {
      background: #2196f3;
    }

    /* Responsive design */
    @media (max-width: 480px) {
      .toast-container {
        top: 8px;
        right: 8px;
        left: 8px;
        max-width: none;
      }

      .toast-item {
        min-width: auto;
        margin-bottom: 8px;
      }

      .toast-content {
        padding: 12px;
        gap: 8px;
      }

      .toast-message {
        font-size: 13px;
      }
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .toast-item {
        background: #333;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .toast-message {
        color: #fff;
      }

      .toast-close {
        color: #ccc;
      }

      .toast-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .toast-progress {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .toast-item {
        border: 2px solid currentColor;
      }

      .toast-close {
        border: 1px solid currentColor;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .toast-item {
        transition: none;
        animation: none;
      }

      .toast-progress-bar {
        animation: none;
        display: none;
      }
    }

    /* Chrome extension specific adjustments */
    @media (max-width: 400px) {
      .toast-container {
        top: 4px;
        right: 4px;
        left: 4px;
      }

      .toast-item {
        font-size: 13px;
      }

      .toast-content {
        padding: 10px 12px;
      }
    }
  `;
}
