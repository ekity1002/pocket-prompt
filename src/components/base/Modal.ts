// Base Modal Component
// Clean Architecture - Presentation Layer

export interface ModalProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  children: HTMLElement[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  overlay?: boolean;
  className?: string;
}

export function createModal(props: ModalProps): HTMLElement {
  if (!props.isOpen) {
    return document.createElement('div');
  }
  
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center';
  
  // Create overlay
  if (props.overlay !== false) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 transition-opacity';
    overlay.addEventListener('click', () => {
      if (props.closable !== false) {
        props.onClose();
      }
    });
    modalContainer.appendChild(overlay);
  }
  
  // Create modal dialog
  const modal = document.createElement('div');
  modal.className = getModalClasses(props);
  
  // Create header
  if (props.title || props.closable !== false) {
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b border-gray-200';
    
    if (props.title) {
      const title = document.createElement('h3');
      title.className = 'text-lg font-semibold text-gray-900';
      title.textContent = props.title;
      header.appendChild(title);
    }
    
    if (props.closable !== false) {
      const closeButton = document.createElement('button');
      closeButton.className = 'text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1';
      closeButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
      closeButton.addEventListener('click', props.onClose);
      header.appendChild(closeButton);
    }
    
    modal.appendChild(header);
  }
  
  // Create content
  const content = document.createElement('div');
  content.className = 'p-4 max-h-96 overflow-y-auto';
  
  props.children.forEach(child => {
    content.appendChild(child);
  });
  
  modal.appendChild(content);
  modalContainer.appendChild(modal);
  
  // Handle escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.closable !== false) {
      props.onClose();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  
  return modalContainer;
}

function getModalClasses(props: ModalProps): string {
  const baseClasses = 'relative bg-white rounded-lg shadow-xl transform transition-all max-w-full max-h-full';
  
  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[48rem]',
  };
  
  const size = props.size || 'md';
  
  return `${baseClasses} ${sizeClasses[size]} ${props.className || ''}`;
}
