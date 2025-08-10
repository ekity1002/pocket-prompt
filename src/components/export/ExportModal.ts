// Export Modal Component
// Clean Architecture - Presentation Layer

import type { ExportFormat, ConversationExport } from '@/types';
import { createModal } from '../base/Modal';
import { createButton } from '../base/Button';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  loading?: boolean;
  exportData?: ConversationExport;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  saveToStorage: boolean;
  filename?: string;
}

export function createExportModal(props: ExportModalProps): HTMLElement {
  if (!props.isOpen) {
    return document.createElement('div');
  }
  
  // Modal state
  let options: ExportOptions = {
    format: 'markdown',
    includeMetadata: true,
    saveToStorage: true,
  };
  
  // Create modal content
  const content: HTMLElement[] = [];
  
  // Header
  const header = document.createElement('div');
  header.className = 'mb-6';
  
  const title = document.createElement('h2');
  title.className = 'text-lg font-semibold text-gray-900 mb-2';
  title.textContent = 'Export Conversation';
  header.appendChild(title);
  
  const description = document.createElement('p');
  description.className = 'text-sm text-gray-600';
  description.textContent = 'Choose export format and options for the current conversation.';
  header.appendChild(description);
  
  content.push(header);
  
  // Format selection
  const formatSection = createFormatSection(options, (newFormat) => {
    options.format = newFormat;
  });
  content.push(formatSection);
  
  // Options section
  const optionsSection = createOptionsSection(options, (newOptions) => {
    options = { ...options, ...newOptions };
  });
  content.push(optionsSection);
  
  // Preview section (if export data is available)
  if (props.exportData) {
    const previewSection = createPreviewSection(props.exportData, options.format);
    content.push(previewSection);
  }
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'flex items-center justify-end space-x-3 pt-6 border-t border-gray-200';
  
  // Cancel button
  const cancelButton = createButton({
    text: 'Cancel',
    onClick: props.onClose,
    variant: 'secondary',
    disabled: props.loading || false,
  });
  actions.appendChild(cancelButton);
  
  // Export button
  const exportButton = createButton({
    text: props.loading ? 'Exporting...' : 'Export',
    onClick: () => props.onExport(options.format, options),
    variant: 'primary',
    loading: props.loading || false,
    disabled: props.loading || false,
  });
  actions.appendChild(exportButton);
  
  content.push(actions);
  
  // Create modal
  const modal = createModal({
    isOpen: props.isOpen,
    onClose: props.onClose,
    children: content,
    size: 'lg',
    closable: !props.loading,
  });
  
  return modal;
}

function createFormatSection(
  options: ExportOptions,
  onChange: (format: ExportFormat) => void
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'mb-6';
  
  const title = document.createElement('h3');
  title.className = 'text-sm font-medium text-gray-900 mb-3';
  title.textContent = 'Export Format';
  section.appendChild(title);
  
  const formats = document.createElement('div');
  formats.className = 'grid grid-cols-2 gap-3';
  
  const formatOptions: { format: ExportFormat; label: string; description: string; icon: string }[] = [
    {
      format: 'markdown',
      label: 'Markdown',
      description: 'Formatted text with headings and styling',
      icon: 'M',
    },
    {
      format: 'json',
      label: 'JSON',
      description: 'Structured data format',
      icon: '{}',
    },
    {
      format: 'txt',
      label: 'Plain Text',
      description: 'Simple text format without formatting',
      icon: 'T',
    },
    {
      format: 'csv',
      label: 'CSV',
      description: 'Spreadsheet compatible format',
      icon: '▦',
    },
  ];
  
  formatOptions.forEach(item => {
    const option = document.createElement('button');
    option.className = getFormatOptionClasses(options.format === item.format);
    option.addEventListener('click', () => {
      onChange(item.format);
      // Update all option classes
      formatOptions.forEach(f => {
        const btn = formats.querySelector(`[data-format="${f.format}"]`) as HTMLElement;
        if (btn) {
          btn.className = getFormatOptionClasses(f.format === item.format);
        }
      });
    });
    option.setAttribute('data-format', item.format);
    
    const content = document.createElement('div');
    content.className = 'flex items-center p-3';
    
    const icon = document.createElement('div');
    icon.className = 'flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm font-bold mr-3';
    icon.textContent = item.icon;
    content.appendChild(icon);
    
    const details = document.createElement('div');
    details.className = 'text-left';
    
    const label = document.createElement('div');
    label.className = 'font-medium text-sm';
    label.textContent = item.label;
    details.appendChild(label);
    
    const description = document.createElement('div');
    description.className = 'text-xs text-gray-600';
    description.textContent = item.description;
    details.appendChild(description);
    
    content.appendChild(details);
    option.appendChild(content);
    formats.appendChild(option);
  });
  
  section.appendChild(formats);
  return section;
}

function createOptionsSection(
  options: ExportOptions,
  onChange: (options: Partial<ExportOptions>) => void
): HTMLElement {
  const section = document.createElement('div');
  section.className = 'mb-6';
  
  const title = document.createElement('h3');
  title.className = 'text-sm font-medium text-gray-900 mb-3';
  title.textContent = 'Export Options';
  section.appendChild(title);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'space-y-3';
  
  // Include metadata option
  const metadataOption = createCheckboxOption({
    label: 'Include metadata',
    description: 'Include export timestamp, site info, and message count',
    checked: options.includeMetadata,
    onChange: (checked) => onChange({ includeMetadata: checked }),
  });
  optionsContainer.appendChild(metadataOption);
  
  // Save to storage option
  const storageOption = createCheckboxOption({
    label: 'Save to local storage',
    description: 'Keep a copy in your extension for later access',
    checked: options.saveToStorage,
    onChange: (checked) => onChange({ saveToStorage: checked }),
  });
  optionsContainer.appendChild(storageOption);
  
  // Custom filename option
  const filenameGroup = document.createElement('div');
  
  const filenameLabel = document.createElement('label');
  filenameLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
  filenameLabel.textContent = 'Custom filename (optional)';
  filenameGroup.appendChild(filenameLabel);
  
  const filenameInput = document.createElement('input');
  filenameInput.type = 'text';
  filenameInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  filenameInput.placeholder = 'e.g., my-conversation';
  filenameInput.value = options.filename || '';
  filenameInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    onChange({ filename: trimmedValue || undefined });
  });
  filenameGroup.appendChild(filenameInput);
  
  optionsContainer.appendChild(filenameGroup);
  section.appendChild(optionsContainer);
  
  return section;
}

function createPreviewSection(exportData: ConversationExport, format: ExportFormat): HTMLElement {
  const section = document.createElement('div');
  section.className = 'mb-6';
  
  const title = document.createElement('h3');
  title.className = 'text-sm font-medium text-gray-900 mb-3';
  title.textContent = 'Preview';
  section.appendChild(title);
  
  const preview = document.createElement('div');
  preview.className = 'bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto';
  
  const previewText = document.createElement('pre');
  previewText.className = 'text-xs text-gray-700 font-mono whitespace-pre-wrap';
  
  // Generate preview based on format
  let content = '';
  switch (format) {
    case 'markdown':
      content = `# ${exportData.data.title}\n\n**Exported from:** ${exportData.site}\n**Messages:** ${exportData.data.messages.length}\n\n---\n\n`;
      if (exportData.data.messages && exportData.data.messages.length > 0) {
        const firstMessage = exportData.data.messages[0];
        if (firstMessage) {
          content += `## ${firstMessage.role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n${firstMessage.content.substring(0, 100)}...`;
        }
      }
      break;
    case 'json':
      content = JSON.stringify({
        title: exportData.data.title,
        site: exportData.site,
        messageCount: exportData.data.messages.length,
        preview: '...',
      }, null, 2);
      break;
    case 'txt':
      content = `${exportData.data.title}\nExported from: ${exportData.site}\n${'='.repeat(40)}\n\n`;
      if (exportData.data.messages && exportData.data.messages.length > 0) {
        const firstMessage = exportData.data.messages[0];
        if (firstMessage) {
          content += `[${firstMessage.role}]\n${firstMessage.content.substring(0, 100)}...`;
        }
      }
      break;
    case 'csv':
      content = 'Index,Role,Content,Timestamp\n';
      if (exportData.data.messages && exportData.data.messages.length > 0) {
        const firstMessage = exportData.data.messages[0];
        if (firstMessage) {
          content += `1,"${firstMessage.role}","${firstMessage.content.substring(0, 50)}...","${firstMessage.timestamp || ''}"`;
        }
      }
      break;
  }
  
  previewText.textContent = content;
  preview.appendChild(previewText);
  section.appendChild(preview);
  
  return section;
}

interface CheckboxOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function createCheckboxOption(props: CheckboxOptionProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex items-start';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'mt-1 mr-3 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500';
  checkbox.checked = props.checked;
  checkbox.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    props.onChange(target.checked);
  });
  
  const content = document.createElement('div');
  
  const label = document.createElement('label');
  label.className = 'text-sm font-medium text-gray-900 cursor-pointer';
  label.textContent = props.label;
  label.addEventListener('click', () => {
    checkbox.checked = !checkbox.checked;
    props.onChange(checkbox.checked);
  });
  
  const description = document.createElement('p');
  description.className = 'text-xs text-gray-600';
  description.textContent = props.description;
  
  content.appendChild(label);
  content.appendChild(description);
  
  container.appendChild(checkbox);
  container.appendChild(content);
  
  return container;
}

function getFormatOptionClasses(selected: boolean): string {
  const baseClasses = 'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200';
  const stateClasses = selected
    ? 'border-primary-500 bg-primary-50 text-primary-900'
    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50';
  
  return `${baseClasses} ${stateClasses}`;
}
