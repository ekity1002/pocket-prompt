// Feature Toggle Component
// Clean Architecture - Presentation Layer

export interface FeatureToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'switch' | 'checkbox';
  className?: string;
}

export function createFeatureToggle(props: FeatureToggleProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getContainerClasses(props);

  if (props.variant === 'checkbox') {
    return createCheckboxToggle(props, container);
  } else {
    return createSwitchToggle(props, container);
  }
}

function createSwitchToggle(props: FeatureToggleProps, container: HTMLElement): HTMLElement {
  // Content container
  const content = document.createElement('div');
  content.className = 'flex-1';

  // Label
  const label = document.createElement('h4');
  label.className = getLabelClasses(props.size);
  label.textContent = props.label;
  content.appendChild(label);

  // Description
  if (props.description) {
    const description = document.createElement('p');
    description.className = getDescriptionClasses(props.size);
    description.textContent = props.description;
    content.appendChild(description);
  }

  // Toggle switch
  const toggle = document.createElement('div');
  toggle.className = 'flex-shrink-0';

  const toggleSwitch = document.createElement('button');
  toggleSwitch.type = 'button';
  toggleSwitch.className = getSwitchClasses(props.checked, props.disabled, props.size);
  toggleSwitch.disabled = props.disabled || false;
  toggleSwitch.setAttribute('role', 'switch');
  toggleSwitch.setAttribute('aria-checked', props.checked.toString());

  // Toggle button
  const toggleButton = document.createElement('span');
  toggleButton.className = getToggleButtonClasses(props.checked, props.size);
  toggleSwitch.appendChild(toggleButton);

  // Event handler
  toggleSwitch.addEventListener('click', () => {
    const newChecked = !props.checked;
    props.onChange(newChecked);
    toggleSwitch.className = getSwitchClasses(newChecked, props.disabled, props.size);
    toggleButton.className = getToggleButtonClasses(newChecked, props.size);
    toggleSwitch.setAttribute('aria-checked', newChecked.toString());
  });

  toggle.appendChild(toggleSwitch);

  container.appendChild(content);
  container.appendChild(toggle);

  return container;
}

function createCheckboxToggle(props: FeatureToggleProps, container: HTMLElement): HTMLElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = getCheckboxClasses(props.size);
  checkbox.checked = props.checked;
  checkbox.disabled = props.disabled || false;

  const content = document.createElement('div');

  const label = document.createElement('label');
  label.className = `${getLabelClasses(props.size)} cursor-pointer`;
  label.textContent = props.label;
  label.addEventListener('click', () => {
    if (!props.disabled) {
      checkbox.checked = !checkbox.checked;
      props.onChange(checkbox.checked);
    }
  });

  content.appendChild(label);

  if (props.description) {
    const description = document.createElement('p');
    description.className = getDescriptionClasses(props.size);
    description.textContent = props.description;
    content.appendChild(description);
  }

  checkbox.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    props.onChange(target.checked);
  });

  container.appendChild(checkbox);
  container.appendChild(content);

  return container;
}

function getContainerClasses(props: FeatureToggleProps): string {
  const baseClasses =
    props.variant === 'checkbox' ? 'flex items-start' : 'flex items-start justify-between';

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const size = props.size || 'md';

  return `${baseClasses} ${sizeClasses[size]} ${props.className || ''}`;
}

function getLabelClasses(size?: string): string {
  const sizeClasses = {
    sm: 'text-sm font-medium text-gray-900',
    md: 'text-sm font-medium text-gray-900',
    lg: 'text-base font-medium text-gray-900',
  };

  return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
}

function getDescriptionClasses(size?: string): string {
  const sizeClasses = {
    sm: 'text-xs text-gray-600',
    md: 'text-xs text-gray-600',
    lg: 'text-sm text-gray-600',
  };

  return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
}

function getSwitchClasses(checked: boolean, disabled?: boolean, size?: string): string {
  const sizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-13',
  };

  const currentSize = size || 'md';
  const baseClasses = `relative inline-flex ${sizeClasses[currentSize as keyof typeof sizeClasses]} flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`;

  let stateClasses = '';
  if (disabled) {
    stateClasses = 'opacity-50 cursor-not-allowed bg-gray-200';
  } else if (checked) {
    stateClasses = 'bg-primary-600';
  } else {
    stateClasses = 'bg-gray-200';
  }

  return `${baseClasses} ${stateClasses}`;
}

function getToggleButtonClasses(checked: boolean, size?: string): string {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const translateClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0',
    md: checked ? 'translate-x-5' : 'translate-x-0',
    lg: checked ? 'translate-x-6' : 'translate-x-0',
  };

  const currentSize = size || 'md';
  const baseClasses = `pointer-events-none inline-block ${sizeClasses[currentSize as keyof typeof sizeClasses]} rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out`;
  const positionClass = translateClasses[currentSize as keyof typeof translateClasses];

  return `${baseClasses} ${positionClass}`;
}

function getCheckboxClasses(size?: string): string {
  const sizeClasses = {
    sm: 'mt-1 mr-2 h-3 w-3',
    md: 'mt-1 mr-3 h-4 w-4',
    lg: 'mt-1 mr-3 h-5 w-5',
  };

  const currentSize = size || 'md';
  const baseClasses = 'text-primary-600 border-gray-300 rounded focus:ring-primary-500';

  return `${baseClasses} ${sizeClasses[currentSize as keyof typeof sizeClasses]}`;
}
