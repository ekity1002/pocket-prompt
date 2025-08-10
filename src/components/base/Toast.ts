// Base Toast Notification Component
// Clean Architecture - Presentation Layer

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  closable?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export interface ToastManager {
  show(props: ToastProps): void;
  clear(): void;
}

class ToastManagerImpl implements ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, HTMLElement> = new Map();

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed z-50 pointer-events-none';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(props: ToastProps): void {
    const container = this.getContainer();
    const toast = createToast(props);
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Update container position
    this.updateContainerPosition(props.position || 'top-right');
    
    container.appendChild(toast);
    this.toasts.set(id, toast);
    
    // Auto-remove after duration
    const duration = props.duration !== undefined ? props.duration : 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
    
    // Add close handler
    const closeHandler = () => {
      this.removeToast(id);
      props.onClose?.();
    };
    
    if (props.closable !== false) {
      const closeButton = toast.querySelector('[data-close]');
      closeButton?.addEventListener('click', closeHandler);
    }
    
    // Auto-close on click if not closable
    if (props.closable === false) {
      toast.addEventListener('click', closeHandler);
    }
  }

  clear(): void {
    this.toasts.forEach((_, id) => {
      this.removeToast(id);
    });
  }

  private removeToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast && toast.parentNode) {
      // Animate out
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        toast.parentNode?.removeChild(toast);
        this.toasts.delete(id);
      }, 300);
    }
  }

  private updateContainerPosition(position: string): void {
    if (!this.container) return;
    
    // Reset classes
    this.container.className = 'fixed z-50 pointer-events-none';
    
    switch (position) {
      case 'top-right':
        this.container.className += ' top-4 right-4';
        break;
      case 'top-left':
        this.container.className += ' top-4 left-4';
        break;
      case 'bottom-right':
        this.container.className += ' bottom-4 right-4';
        break;
      case 'bottom-left':
        this.container.className += ' bottom-4 left-4';
        break;
      case 'top-center':
        this.container.className += ' top-4 left-1/2 transform -translate-x-1/2';
        break;
      case 'bottom-center':
        this.container.className += ' bottom-4 left-1/2 transform -translate-x-1/2';
        break;
    }
  }
}

// Global toast manager instance
export const toastManager: ToastManager = new ToastManagerImpl();

export function createToast(props: ToastProps): HTMLElement {
  const toast = document.createElement('div');
  toast.className = getToastClasses(props);
  
  // Create content
  const content = document.createElement('div');
  content.className = 'flex items-start';
  
  // Add icon
  const icon = document.createElement('div');
  icon.className = 'flex-shrink-0 mr-3';
  icon.innerHTML = getToastIcon(props.type || 'info');
  content.appendChild(icon);
  
  // Add message
  const message = document.createElement('div');
  message.className = 'flex-1 text-sm font-medium';
  message.textContent = props.message;
  content.appendChild(message);
  
  // Add close button
  if (props.closable !== false) {
    const closeButton = document.createElement('button');
    closeButton.className = 'ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none';
    closeButton.setAttribute('data-close', 'true');
    closeButton.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;
    content.appendChild(closeButton);
  }
  
  toast.appendChild(content);
  
  return toast;
}

function getToastClasses(props: ToastProps): string {
  const baseClasses = 'pointer-events-auto mb-3 max-w-sm w-full bg-white shadow-lg rounded-lg border transform transition-all duration-300 ease-in-out';
  
  const typeClasses = {
    success: 'border-green-200 text-green-800',
    error: 'border-red-200 text-red-800',
    warning: 'border-yellow-200 text-yellow-800',
    info: 'border-blue-200 text-blue-800',
  };
  
  const type = props.type || 'info';
  
  return `${baseClasses} ${typeClasses[type]} p-4`;
}

function getToastIcon(type: string): string {
  const icons = {
    success: `
      <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `,
    error: `
      <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `,
    warning: `
      <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
    `,
    info: `
      <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `,
  };
  
  return icons[type as keyof typeof icons] || icons.info;
}
