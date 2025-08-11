// CopyButton Component
// TASK-0014: ワンクリックコピー機能UI実装

export interface CopyButtonProps {
  promptId: string;
  onCopy: (promptId: string) => Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export type CopyState = 'idle' | 'copying' | 'success' | 'error';

export class CopyButton {
  private element: HTMLButtonElement;
  private state: CopyState = 'idle';
  private props: CopyButtonProps;
  private stateTimeout: NodeJS.Timeout | null = null;

  constructor(props: CopyButtonProps) {
    this.props = props;
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = this.getButtonClasses();
    button.setAttribute('aria-label', 'プロンプトをクリップボードにコピー');
    button.setAttribute('data-prompt-id', this.props.promptId);
    button.setAttribute('type', 'button');
    button.disabled = this.props.disabled || false;

    // Set initial content directly instead of calling updateButtonContent
    const iconHtml = this.getIconHtml();
    button.innerHTML = iconHtml;
    
    return button;
  }

  private getButtonClasses(): string {
    const baseClasses = 'copy-button';
    const variantClass = `copy-button--${this.props.variant || 'default'}`;
    const stateClass = `copy-button--${this.state}`;
    const customClasses = this.props.className || '';

    return [baseClasses, variantClass, stateClass, customClasses].join(' ');
  }

  private updateButtonContent(): void {
    const iconHtml = this.getIconHtml();
    this.element.innerHTML = iconHtml;
    this.element.className = this.getButtonClasses();

    // Update ARIA attributes
    const ariaLabel = this.getAriaLabel();
    this.element.setAttribute('aria-label', ariaLabel);

    // Update disabled state
    this.element.disabled = this.props.disabled || this.state === 'copying';
  }

  private getIconHtml(): string {
    const iconSize = this.props.variant === 'compact' ? '16' : '20';

    switch (this.state) {
      case 'copying':
        return `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-hidden="true" class="copy-icon copy-icon--loading">
            <circle cx="12" cy="12" r="10" opacity="0.2"/>
            <path d="M12 6v6l4 2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      case 'success':
        return `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-hidden="true" class="copy-icon copy-icon--success">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      case 'error':
        return `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-hidden="true" class="copy-icon copy-icon--error">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke-linecap="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke-linecap="round"/>
          </svg>
        `;
      default:
        return `
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" role="img" aria-hidden="true" class="copy-icon copy-icon--default">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
    }
  }

  private getAriaLabel(): string {
    switch (this.state) {
      case 'copying':
        return 'プロンプトをコピー中...';
      case 'success':
        return 'プロンプトをコピーしました';
      case 'error':
        return 'プロンプトのコピーに失敗しました';
      default:
        return 'プロンプトをクリップボードにコピー';
    }
  }

  private setupEventListeners(): void {
    this.element.addEventListener('click', this.handleClick.bind(this));
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private async handleClick(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (this.state === 'copying' || this.props.disabled) {
      return;
    }

    await this.executesCopy();
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      await this.executesCopy();
    }
  }

  private async executesCopy(): Promise<void> {
    try {
      this.setState('copying');

      await this.props.onCopy(this.props.promptId);

      this.setState('success');
      this.scheduleStateReset(2000); // Reset after 2 seconds

    } catch (error) {
      console.error('Copy failed:', error);
      this.setState('error');
      this.scheduleStateReset(3000); // Reset after 3 seconds
    }
  }

  private setState(newState: CopyState): void {
    if (this.state === newState) return;

    this.state = newState;
    this.updateButtonContent();

    // Clear any existing timeout
    if (this.stateTimeout) {
      clearTimeout(this.stateTimeout);
      this.stateTimeout = null;
    }

    // Trigger animation
    this.triggerAnimation();
  }

  private scheduleStateReset(delay: number): void {
    this.stateTimeout = setTimeout(() => {
      this.setState('idle');
      this.stateTimeout = null;
    }, delay);
  }

  private triggerAnimation(): void {
    // Remove and re-add animation class to trigger CSS animation
    this.element.classList.remove('copy-button--animate');
    // Force reflow
    this.element.offsetHeight;
    this.element.classList.add('copy-button--animate');

    // Remove animation class after animation completes
    setTimeout(() => {
      this.element.classList.remove('copy-button--animate');
    }, 300);
  }

  // Public methods for external control
  public updateProps(newProps: Partial<CopyButtonProps>): void {
    this.props = { ...this.props, ...newProps };
    this.element.setAttribute('data-prompt-id', this.props.promptId);
    this.element.disabled = this.props.disabled || this.state === 'copying';
    this.updateButtonContent();
  }

  public getState(): CopyState {
    return this.state;
  }

  public getElement(): HTMLButtonElement {
    return this.element;
  }

  public destroy(): void {
    if (this.stateTimeout) {
      clearTimeout(this.stateTimeout);
      this.stateTimeout = null;
    }

    this.element.removeEventListener('click', this.handleClick.bind(this));
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  public reset(): void {
    if (this.stateTimeout) {
      clearTimeout(this.stateTimeout);
      this.stateTimeout = null;
    }
    this.setState('idle');
  }

  // Static factory method for easy creation
  static create(props: CopyButtonProps): CopyButton {
    return new CopyButton(props);
  }
}

// CSS-in-JS helper for dynamic styles
export function getCopyButtonStyles(): string {
  return `
    .copy-button {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .copy-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 1);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .copy-button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .copy-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .copy-button:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Variants */
    .copy-button--compact {
      width: 24px;
      height: 24px;
      top: 4px;
      right: 4px;
    }

    /* States */
    .copy-button--copying {
      background: rgba(33, 150, 243, 0.1);
      color: #2196f3;
    }

    .copy-button--success {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }

    .copy-button--error {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }

    /* Icons */
    .copy-icon {
      transition: all 0.2s ease;
    }

    .copy-icon--loading {
      animation: spin 1s linear infinite;
    }

    .copy-icon--success,
    .copy-icon--error {
      animation: pulse 0.3s ease-out;
    }

    /* Animations */
    .copy-button--animate {
      animation: copyButtonBounce 0.3s ease-out;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes copyButtonBounce {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .copy-button,
      .copy-icon,
      .copy-button--animate {
        animation: none !important;
        transition: none !important;
      }

      .copy-button:hover:not(:disabled) {
        transform: none;
      }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .copy-button {
        border: 2px solid currentColor;
        background: var(--background-color, white);
      }

      .copy-button--success {
        border-color: #4caf50;
      }

      .copy-button--error {
        border-color: #f44336;
      }

      .copy-button--copying {
        border-color: #2196f3;
      }
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .copy-button {
        background: rgba(33, 33, 33, 0.95);
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .copy-button:hover:not(:disabled) {
        background: rgba(66, 66, 66, 1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
      }

      .copy-button:focus {
        box-shadow: 0 0 0 2px rgba(144, 202, 249, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
      }
    }
  `;
}