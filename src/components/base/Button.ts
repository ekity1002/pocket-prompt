// Base Button Component
// Clean Architecture - Presentation Layer

export interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

export function createButton(props: ButtonProps): HTMLButtonElement {
  const button = document.createElement('button');
  
  // Set base classes
  button.className = getButtonClasses(props);
  
  // Set content
  if (props.loading) {
    button.innerHTML = `
      <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${props.text}
    `;
  } else {
    button.textContent = props.text;
  }
  
  // Set properties
  button.disabled = props.disabled || props.loading || false;
  
  // Add event listener
  button.addEventListener('click', props.onClick);
  
  return button;
}

function getButtonClasses(props: ButtonProps): string {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Variant classes
  const variantClasses = {
    primary: 'chrome-button',
    secondary: 'chrome-button-secondary', 
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const variant = props.variant || 'primary';
  const size = props.size || 'md';
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
  ];
  
  if (props.disabled || props.loading) {
    classes.push('opacity-50 cursor-not-allowed');
  }
  
  return classes.join(' ');
}