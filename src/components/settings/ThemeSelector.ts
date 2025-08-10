// Theme Selector Component
// Clean Architecture - Presentation Layer

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeSelectorProps {
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  disabled?: boolean;
  variant?: 'buttons' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function createThemeSelector(props: ThemeSelectorProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getContainerClasses(props);
  
  if (props.variant === 'dropdown') {
    return createDropdownSelector(props, container);
  } else {
    return createButtonSelector(props, container);
  }
}

function createButtonSelector(props: ThemeSelectorProps, container: HTMLElement): HTMLElement {
  const themes: { value: Theme; label: string; icon: string; description: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: '☀️',
      description: 'Light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: '🌙',
      description: 'Dark theme',
    },
    {
      value: 'auto',
      label: 'Auto',
      icon: '🖥️',
      description: 'Follow system',
    },
  ];
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'grid grid-cols-3 gap-3';
  
  themes.forEach(theme => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = getThemeButtonClasses(
      props.selectedTheme === theme.value,
      props.disabled,
      props.size
    );
    button.disabled = props.disabled || false;
    button.title = theme.description;
    button.setAttribute('data-theme', theme.value);
    
    // Button content
    const content = document.createElement('div');
    content.className = 'flex flex-col items-center';
    
    const icon = document.createElement('div');
    icon.className = getIconClasses(props.size);
    icon.textContent = theme.icon;
    content.appendChild(icon);
    
    const label = document.createElement('span');
    label.className = getLabelClasses(props.size);
    label.textContent = theme.label;
    content.appendChild(label);
    
    button.appendChild(content);
    
    // Event handler
    button.addEventListener('click', () => {
      if (!props.disabled) {
        props.onThemeChange(theme.value);
        // Update button states
        themes.forEach(t => {
          const btn = buttonGroup.querySelector(`[data-theme="${t.value}"]`) as HTMLElement;
          if (btn) {
            btn.className = getThemeButtonClasses(
              t.value === theme.value,
              props.disabled,
              props.size
            );
          }
        });
      }
    });
    
    buttonGroup.appendChild(button);
  });
  
  container.appendChild(buttonGroup);
  return container;
}

function createDropdownSelector(props: ThemeSelectorProps, container: HTMLElement): HTMLElement {
  const select = document.createElement('select');
  select.className = getSelectClasses(props.disabled, props.size);
  select.disabled = props.disabled || false;
  
  const themes: { value: Theme; label: string; description: string }[] = [
    { value: 'light', label: 'Light Theme', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark Theme', description: 'Always use dark theme' },
    { value: 'auto', label: 'Auto (System)', description: 'Follow system preference' },
  ];
  
  themes.forEach(theme => {
    const option = document.createElement('option');
    option.value = theme.value;
    option.textContent = theme.label;
    option.selected = theme.value === props.selectedTheme;
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    props.onThemeChange(target.value as Theme);
  });
  
  container.appendChild(select);
  return container;
}

// Theme Application Utility
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('theme-light', 'theme-dark', 'theme-auto');
  
  if (theme === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      root.classList.remove('theme-light', 'theme-dark');
      root.classList.add(e.matches ? 'theme-dark' : 'theme-light');
    });
  } else {
    // Use explicit theme
    root.classList.add(`theme-${theme}`);
  }
  
  // Store preference
  try {
    localStorage.setItem('pocket-prompt-theme', theme);
  } catch (error) {
    console.warn('Unable to save theme preference:', error);
  }
}

// Theme Detection Utility
export function getCurrentTheme(): Theme {
  try {
    const saved = localStorage.getItem('pocket-prompt-theme') as Theme;
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      return saved;
    }
  } catch (error) {
    console.warn('Unable to read theme preference:', error);
  }
  
  // Default to auto
  return 'auto';
}

// Style Classes
function getContainerClasses(props: ThemeSelectorProps): string {
  const baseClasses = 'theme-selector';
  const disabledClass = props.disabled ? 'opacity-50' : '';
  
  return `${baseClasses} ${disabledClass} ${props.className || ''}`;
}

function getThemeButtonClasses(selected: boolean, disabled?: boolean, size?: string): string {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };
  
  const currentSize = size || 'md';
  const baseClasses = `w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200 ${sizeClasses[currentSize as keyof typeof sizeClasses]}`;
  
  let stateClasses = '';
  if (disabled) {
    stateClasses = 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed';
  } else if (selected) {
    stateClasses = 'border-primary-500 bg-primary-50 text-primary-900';
  } else {
    stateClasses = 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50';
  }
  
  return `${baseClasses} ${stateClasses}`;
}

function getSelectClasses(disabled?: boolean, size?: string): string {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };
  
  const currentSize = size || 'md';
  const baseClasses = `block w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${sizeClasses[currentSize as keyof typeof sizeClasses]}`;
  
  const stateClass = disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900';
  
  return `${baseClasses} ${stateClass}`;
}

function getIconClasses(size?: string): string {
  const sizeClasses = {
    sm: 'text-base mb-1',
    md: 'text-lg mb-1',
    lg: 'text-xl mb-2',
  };
  
  return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
}

function getLabelClasses(size?: string): string {
  const sizeClasses = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-medium',
    lg: 'text-base font-medium',
  };
  
  return sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
}
