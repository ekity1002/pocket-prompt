// Export Button Component
// Clean Architecture - Presentation Layer

import type { ExportFormat, SupportedAISite } from '@/types';

export interface ExportButtonProps {
  site?: SupportedAISite;
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
  showFormats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function createExportButton(props: ExportButtonProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'relative inline-block';

  const button = document.createElement('button');
  button.className = getButtonClasses(props);
  button.disabled = props.disabled || props.loading || false;

  // Button content
  const content = document.createElement('div');
  content.className = 'flex items-center';

  // Loading spinner or icon
  if (props.loading) {
    const spinner = document.createElement('div');
    spinner.className = 'mr-2';
    spinner.innerHTML = `
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `;
    content.appendChild(spinner);
  } else {
    const icon = document.createElement('div');
    icon.className = 'mr-2';
    icon.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
      </svg>
    `;
    content.appendChild(icon);
  }

  // Button text
  const text = document.createElement('span');
  text.textContent = props.loading ? 'Exporting...' : 'Export';
  content.appendChild(text);

  // Dropdown arrow
  if (props.showFormats !== false) {
    const arrow = document.createElement('div');
    arrow.className = 'ml-2';
    arrow.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;
    content.appendChild(arrow);
  }

  button.appendChild(content);
  container.appendChild(button);

  // Dropdown menu for formats
  if (props.showFormats !== false) {
    let isOpen = false;
    const dropdown = createFormatDropdown(props.onExport);
    dropdown.style.display = 'none';
    container.appendChild(dropdown);

    // Toggle dropdown
    button.addEventListener('click', () => {
      if (props.disabled || props.loading) return;

      isOpen = !isOpen;
      dropdown.style.display = isOpen ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target as Node)) {
        isOpen = false;
        dropdown.style.display = 'none';
      }
    });
  } else {
    // Single format export (default to markdown)
    button.addEventListener('click', () => {
      if (!props.disabled && !props.loading) {
        props.onExport('markdown');
      }
    });
  }

  return container;
}

function createFormatDropdown(onExport: (format: ExportFormat) => void): HTMLElement {
  const dropdown = document.createElement('div');
  dropdown.className =
    'absolute right-0 z-10 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg';

  const formats: { format: ExportFormat; label: string; description: string }[] = [
    {
      format: 'markdown',
      label: 'Markdown',
      description: 'Formatted text with headings',
    },
    {
      format: 'json',
      label: 'JSON',
      description: 'Structured data format',
    },
    {
      format: 'txt',
      label: 'Plain Text',
      description: 'Simple text format',
    },
    {
      format: 'csv',
      label: 'CSV',
      description: 'Spreadsheet compatible',
    },
  ];

  formats.forEach((item, index) => {
    const option = document.createElement('button');
    option.className = `w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
      index === 0 ? 'rounded-t-lg' : ''
    } ${index === formats.length - 1 ? 'rounded-b-lg' : ''}`;

    const content = document.createElement('div');

    const label = document.createElement('div');
    label.className = 'font-medium text-gray-900';
    label.textContent = item.label;
    content.appendChild(label);

    const description = document.createElement('div');
    description.className = 'text-sm text-gray-500';
    description.textContent = item.description;
    content.appendChild(description);

    option.appendChild(content);

    option.addEventListener('click', (e) => {
      e.stopPropagation();
      onExport(item.format);
      dropdown.style.display = 'none';
    });

    dropdown.appendChild(option);
  });

  return dropdown;
}

function getButtonClasses(props: ExportButtonProps): string {
  const baseClasses =
    'inline-flex items-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200';

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const size = props.size || 'md';

  // State classes
  const stateClasses =
    props.disabled || props.loading
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-primary-600 text-white hover:bg-primary-700';

  const classes = [baseClasses, sizeClasses[size], stateClasses, props.className || ''];

  return classes.join(' ');
}
