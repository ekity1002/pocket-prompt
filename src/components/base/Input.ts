// Base Input Component
// Clean Architecture - Presentation Layer

export interface InputProps {
  type?: 'text' | 'password' | 'email' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyPress?: (event: KeyboardEvent) => void;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  className?: string;
  id?: string;
}

export function createInput(props: InputProps): HTMLInputElement {
  const input = document.createElement('input');
  
  // Set attributes
  input.type = props.type || 'text';
  if (props.placeholder) input.placeholder = props.placeholder;
  if (props.value !== undefined) input.value = props.value;
  if (props.disabled) input.disabled = props.disabled;
  if (props.required) input.required = props.required;
  if (props.maxLength) input.maxLength = props.maxLength;
  if (props.id) input.id = props.id;
  
  // Set classes
  input.className = getInputClasses(props);
  
  // Add event listeners
  if (props.onChange) {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      props.onChange?.(target.value);
    });
  }
  
  if (props.onFocus) {
    input.addEventListener('focus', props.onFocus);
  }
  
  if (props.onBlur) {
    input.addEventListener('blur', props.onBlur);
  }
  
  if (props.onKeyPress) {
    input.addEventListener('keypress', props.onKeyPress);
  }
  
  return input;
}

function getInputClasses(props: InputProps): string {
  const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200';
  
  const stateClasses = props.disabled 
    ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
    : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400';
  
  return `${baseClasses} ${stateClasses} ${props.className || ''}`;
}
