// Delete Button Component with confirmation
// TASK-0022: プロンプト保存・更新処理実装

export interface DeleteButtonOptions {
  promptId: string;
  promptTitle: string;
  onDelete: (promptId: string) => Promise<void>;
  variant?: 'default' | 'compact' | 'inline';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Button component for deleting prompts with confirmation dialog
 */
export class DeleteButton {
  private element: HTMLElement | null = null;
  private options: DeleteButtonOptions;
  private isDeleting = false;

  constructor(options: DeleteButtonOptions) {
    this.options = options;
    this.createElement();
  }

  /**
   * Get the button element
   */
  public getElement(): HTMLElement {
    if (!this.element) {
      throw new Error('Delete button element not created');
    }
    return this.element;
  }

  /**
   * Destroy the button and cleanup resources
   */
  public destroy(): void {
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  /**
   * Update button state
   */
  public setDeleting(deleting: boolean): void {
    this.isDeleting = deleting;
    this.updateButtonState();
  }

  /**
   * Create button DOM element
   */
  private createElement(): void {
    this.element = document.createElement('button');
    this.element.type = 'button';
    this.element.className = `delete-button delete-button-${this.options.variant || 'default'}`;
    this.element.setAttribute('aria-label', `プロンプト「${this.options.promptTitle}」を削除`);
    this.element.title = 'プロンプトを削除';

    // Add positioning class (only for non-inline variants)
    if (this.options.position && this.options.variant !== 'inline') {
      this.element.classList.add(`delete-button-${this.options.position}`);
    }

    this.updateButtonContent();
    this.setupEventListeners();
    this.addStyles();
  }

  /**
   * Update button content based on state
   */
  private updateButtonContent(): void {
    if (!this.element) return;

    if (this.isDeleting) {
      this.element.innerHTML = `
        <span class="delete-spinner"></span>
        <span class="sr-only">削除中...</span>
      `;
    } else {
      this.element.innerHTML = `
        <svg class="delete-icon" viewBox="0 0 16 16" width="14" height="14">
          <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-1.004a.58.58 0 0 0-.01 0H11Zm1.463 1-.85 10.66a1 1 0 0 1-.997.92H4.885a1 1 0 0 1-.997-.92L3.037 3.5h9.426Zm-2.224 1.68a.5.5 0 0 1 .5.56L10.5 12.5a.5.5 0 0 1-1 0L9.739 5.74a.5.5 0 0 1 .5-.56Zm-4.478 0a.5.5 0 0 1 .5.56L6.5 12.5a.5.5 0 0 1-1 0L5.761 5.74a.5.5 0 0 1 .5-.56Z"/>
        </svg>
        <span class="sr-only">削除</span>
      `;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.element?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleClick();
    });

    // Prevent parent element events
    this.element?.addEventListener('mousedown', (e) => e.stopPropagation());
    this.element?.addEventListener('mouseup', (e) => e.stopPropagation());
  }

  /**
   * Handle button click with confirmation
   */
  private async handleClick(): Promise<void> {
    if (this.isDeleting) return;

    // Show confirmation dialog
    const confirmed = confirm(
      `プロンプト「${this.options.promptTitle}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`
    );

    if (!confirmed) return;

    this.setDeleting(true);

    try {
      await this.options.onDelete(this.options.promptId);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      this.setDeleting(false);
    }
  }

  /**
   * Update button state styling
   */
  private updateButtonState(): void {
    if (!this.element) return;

    this.element.disabled = this.isDeleting;
    this.updateButtonContent();

    if (this.isDeleting) {
      this.element.classList.add('deleting');
    } else {
      this.element.classList.remove('deleting');
    }
  }

  /**
   * Add CSS styles for delete button
   */
  private addStyles(): void {
    if (document.querySelector('#delete-button-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'delete-button-styles';
    styles.textContent = `
      .delete-button {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #e53e3e;
        border-radius: 4px;
        color: #e53e3e;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(4px);
      }

      .delete-button-default {
        position: absolute;
        width: 28px;
        height: 28px;
        top: 8px;
        right: 8px;
        opacity: 0;
        z-index: 10;
      }

      .delete-button-compact {
        position: absolute;
        width: 22px;
        height: 22px;
        top: 4px;
        right: 4px;
        opacity: 0;
        z-index: 10;
      }

      .delete-button-inline {
        position: relative;
        width: 32px;
        height: 32px;
        margin-left: 4px;
        opacity: 1;
      }

      .delete-button-top-right {
        top: 8px;
        right: 8px;
      }

      .delete-button-top-left {
        top: 8px;
        left: 8px;
      }

      .delete-button-bottom-right {
        bottom: 8px;
        right: 8px;
      }

      .delete-button-bottom-left {
        bottom: 8px;
        left: 8px;
      }

      .delete-button:hover {
        background: #e53e3e;
        color: white;
        box-shadow: 0 2px 8px rgba(229, 62, 62, 0.3);
        transform: scale(1.05);
      }

      .delete-button:active {
        transform: scale(0.95);
      }

      .delete-button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .delete-button.deleting {
        background: #e53e3e;
        color: white;
      }

      /* Show delete button on parent hover */
      .prompt-item:hover .delete-button {
        opacity: 1;
      }

      .delete-icon {
        fill: currentColor;
      }

      .delete-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: delete-spin 1s linear infinite;
      }

      @keyframes delete-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .delete-button {
          background: rgba(45, 55, 72, 0.9);
          border-color: #fc8181;
          color: #fc8181;
        }

        .delete-button:hover,
        .delete-button.deleting {
          background: #fc8181;
          color: #1a202c;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .delete-button {
          background: white;
          border-width: 2px;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .delete-button {
          transition: none;
        }
        
        .delete-button:hover {
          transform: none;
        }
        
        .delete-spinner {
          animation: none;
          border-top-color: currentColor;
          opacity: 0.7;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}
