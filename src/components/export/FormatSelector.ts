// Format Selector Component
// Clean Architecture - Presentation Layer

import type { ExportFormat } from '@/types';

export interface FormatSelectorProps {
  selectedFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function createFormatSelector(props: FormatSelectorProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getSelectorClasses(props);

  const formats: { format: ExportFormat; label: string; description: string }[] = [
    {
      format: 'markdown',
      label: 'Markdown',
      description: 'Rich text with formatting',
    },
    {
      format: 'json',
      label: 'JSON',
      description: 'Structured data',
    },
    {
      format: 'txt',
      label: 'Text',
      description: 'Plain text format',
    },
    {
      format: 'csv',
      label: 'CSV',
      description: 'Spreadsheet format',
    },
  ];

  if (props.compact) {
    // Compact dropdown selector
    const select = document.createElement('select');
    select.className =
      'block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
    select.disabled = props.disabled || false;

    formats.forEach((format) => {
      const option = document.createElement('option');
      option.value = format.format;
      option.textContent = `${format.label} - ${format.description}`;
      option.selected = format.format === props.selectedFormat;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      props.onFormatChange(target.value as ExportFormat);
    });

    container.appendChild(select);
  } else {
    // Full radio button selector
    const legend = document.createElement('fieldset');
    legend.className = 'space-y-3';

    const title = document.createElement('legend');
    title.className = 'text-sm font-medium text-gray-900 mb-3';
    title.textContent = 'Export Format';
    legend.appendChild(title);

    formats.forEach((format) => {
      const option = document.createElement('div');
      option.className = 'flex items-center';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'export-format';
      radio.value = format.format;
      radio.className = 'h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500';
      radio.checked = format.format === props.selectedFormat;
      radio.disabled = props.disabled || false;
      radio.addEventListener('change', () => {
        if (radio.checked) {
          props.onFormatChange(format.format);
        }
      });

      const labelContainer = document.createElement('div');
      labelContainer.className = 'ml-3';

      const label = document.createElement('label');
      label.className = 'text-sm font-medium text-gray-900 cursor-pointer';
      label.textContent = format.label;
      label.addEventListener('click', () => {
        radio.checked = true;
        props.onFormatChange(format.format);
      });

      const description = document.createElement('p');
      description.className = 'text-xs text-gray-600';
      description.textContent = format.description;

      labelContainer.appendChild(label);
      labelContainer.appendChild(description);

      option.appendChild(radio);
      option.appendChild(labelContainer);
      legend.appendChild(option);
    });

    container.appendChild(legend);
  }

  return container;
}

function getSelectorClasses(props: FormatSelectorProps): string {
  const baseClasses = props.compact ? 'w-full' : 'space-y-1';
  const disabledClass = props.disabled ? 'opacity-50' : '';

  return `${baseClasses} ${disabledClass} ${props.className || ''}`;
}
