// Settings Form Component
// Clean Architecture - Presentation Layer

import type { UserSettings, FeatureFlags } from '@/types';

export interface SettingsFormProps {
  settings: UserSettings;
  onSettingsChange: (settings: Partial<UserSettings>) => void;
  onSave?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  saveText?: string;
  cancelText?: string;
}

export function createSettingsForm(props: SettingsFormProps): HTMLElement {
  const form = document.createElement('form');
  form.className = 'space-y-6';
  
  // Form state
  let currentSettings = { ...props.settings };
  
  // General Settings Section
  const generalSection = createSection({
    title: 'General Settings',
    description: 'Configure basic preferences',
  });
  
  // Theme setting
  const themeGroup = createThemeGroup({
    value: currentSettings.theme,
    onChange: (theme) => {
      currentSettings.theme = theme;
      props.onSettingsChange({ theme });
    },
    disabled: props.disabled,
  });
  generalSection.appendChild(themeGroup);
  
  // Language setting
  const languageGroup = createLanguageGroup({
    value: currentSettings.language,
    onChange: (language) => {
      currentSettings.language = language;
      props.onSettingsChange({ language });
    },
    disabled: props.disabled,
  });
  generalSection.appendChild(languageGroup);
  
  form.appendChild(generalSection);
  
  // Features Section
  const featuresSection = createSection({
    title: 'Features',
    description: 'Enable or disable specific functionality',
  });
  
  const featuresGroup = createFeaturesGroup({
    features: currentSettings.features,
    onChange: (features) => {
      currentSettings.features = { ...currentSettings.features, ...features };
      props.onSettingsChange({ features: currentSettings.features });
    },
    disabled: props.disabled,
  });
  featuresSection.appendChild(featuresGroup);
  
  form.appendChild(featuresSection);
  
  // Actions
  if (props.onSave || props.onCancel) {
    const actions = document.createElement('div');
    actions.className = 'flex items-center justify-end space-x-3 pt-6 border-t border-gray-200';
    
    // Cancel button
    if (props.onCancel) {
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
      cancelButton.textContent = props.cancelText || 'Cancel';
      cancelButton.disabled = props.disabled || false;
      cancelButton.addEventListener('click', props.onCancel);
      actions.appendChild(cancelButton);
    }
    
    // Save button
    if (props.onSave) {
      const saveButton = document.createElement('button');
      saveButton.type = 'submit';
      saveButton.className = 'px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
      saveButton.textContent = props.saveText || 'Save Settings';
      saveButton.disabled = props.disabled || false;
      actions.appendChild(saveButton);
    }
    
    form.appendChild(actions);
  }
  
  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    props.onSave?.();
  });
  
  return form;
}

interface SectionProps {
  title: string;
  description?: string;
}

function createSection(props: SectionProps): HTMLElement {
  const section = document.createElement('div');
  section.className = 'space-y-4';
  
  const header = document.createElement('div');
  header.className = 'pb-3 border-b border-gray-200';
  
  const title = document.createElement('h3');
  title.className = 'text-lg font-medium text-gray-900';
  title.textContent = props.title;
  header.appendChild(title);
  
  if (props.description) {
    const description = document.createElement('p');
    description.className = 'text-sm text-gray-600';
    description.textContent = props.description;
    header.appendChild(description);
  }
  
  section.appendChild(header);
  
  return section;
}

interface ThemeGroupProps {
  value: 'light' | 'dark' | 'auto';
  onChange: (theme: 'light' | 'dark' | 'auto') => void;
  disabled?: boolean;
}

function createThemeGroup(props: ThemeGroupProps): HTMLElement {
  const group = document.createElement('div');
  
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 mb-2';
  label.textContent = 'Theme';
  group.appendChild(label);
  
  const themeOptions = document.createElement('div');
  themeOptions.className = 'grid grid-cols-3 gap-3';
  
  const themes: { value: 'light' | 'dark' | 'auto'; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'auto', label: 'Auto', icon: '📱' },
  ];
  
  themes.forEach(theme => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = getThemeButtonClasses(props.value === theme.value);
    button.disabled = props.disabled || false;
    button.addEventListener('click', () => {
      props.onChange(theme.value);
      // Update button states
      themes.forEach(t => {
        const btn = themeOptions.querySelector(`[data-theme="${t.value}"]`) as HTMLElement;
        if (btn) {
          btn.className = getThemeButtonClasses(t.value === theme.value);
        }
      });
    });
    button.setAttribute('data-theme', theme.value);
    
    const content = document.createElement('div');
    content.className = 'flex flex-col items-center p-3';
    
    const icon = document.createElement('div');
    icon.className = 'text-lg mb-1';
    icon.textContent = theme.icon;
    content.appendChild(icon);
    
    const label = document.createElement('span');
    label.className = 'text-sm font-medium';
    label.textContent = theme.label;
    content.appendChild(label);
    
    button.appendChild(content);
    themeOptions.appendChild(button);
  });
  
  group.appendChild(themeOptions);
  
  return group;
}

interface LanguageGroupProps {
  value: 'ja' | 'en';
  onChange: (language: 'ja' | 'en') => void;
  disabled?: boolean;
}

function createLanguageGroup(props: LanguageGroupProps): HTMLElement {
  const group = document.createElement('div');
  
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 mb-2';
  label.textContent = 'Language';
  group.appendChild(label);
  
  const select = document.createElement('select');
  select.className = 'block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  select.disabled = props.disabled || false;
  
  const languages = [
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'en', label: 'English' },
  ];
  
  languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.value;
    option.textContent = lang.label;
    option.selected = lang.value === props.value;
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    props.onChange(target.value as 'ja' | 'en');
  });
  
  group.appendChild(select);
  
  return group;
}

interface FeaturesGroupProps {
  features: FeatureFlags;
  onChange: (features: Partial<FeatureFlags>) => void;
  disabled?: boolean;
}

function createFeaturesGroup(props: FeaturesGroupProps): HTMLElement {
  const group = document.createElement('div');
  group.className = 'space-y-4';
  
  const featureOptions: { key: keyof FeatureFlags; label: string; description: string }[] = [
    {
      key: 'tagManagement',
      label: 'Tag Management',
      description: 'Enable tag-based organization of prompts',
    },
    {
      key: 'searchFiltering',
      label: 'Advanced Search',
      description: 'Enable advanced search and filtering options',
    },
    {
      key: 'aiSiteIntegration',
      label: 'AI Site Integration',
      description: 'Enable text insertion and conversation export from AI sites',
    },
    {
      key: 'cloudSync',
      label: 'Cloud Sync',
      description: 'Synchronize prompts across devices (experimental)',
    },
    {
      key: 'multiAiSupport',
      label: 'Multi-AI Support',
      description: 'Support for multiple AI platforms (ChatGPT, Claude, Gemini)',
    },
  ];
  
  featureOptions.forEach(feature => {
    const featureItem = createFeatureToggle({
      label: feature.label,
      description: feature.description,
      checked: props.features[feature.key],
      onChange: (checked) => {
        props.onChange({ [feature.key]: checked } as Partial<FeatureFlags>);
      },
      disabled: props.disabled,
    });
    group.appendChild(featureItem);
  });
  
  return group;
}

interface FeatureToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function createFeatureToggle(props: FeatureToggleProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex items-start justify-between p-4 bg-gray-50 rounded-lg';
  
  const content = document.createElement('div');
  content.className = 'flex-1';
  
  const label = document.createElement('h4');
  label.className = 'text-sm font-medium text-gray-900';
  label.textContent = props.label;
  content.appendChild(label);
  
  const description = document.createElement('p');
  description.className = 'text-xs text-gray-600';
  description.textContent = props.description;
  content.appendChild(description);
  
  const toggle = document.createElement('div');
  toggle.className = 'flex-shrink-0 ml-4';
  
  const toggleSwitch = document.createElement('button');
  toggleSwitch.type = 'button';
  toggleSwitch.className = getToggleSwitchClasses(props.checked, props.disabled);
  toggleSwitch.disabled = props.disabled || false;
  toggleSwitch.addEventListener('click', () => {
    const newChecked = !props.checked;
    props.onChange(newChecked);
    toggleSwitch.className = getToggleSwitchClasses(newChecked, props.disabled);
  });
  
  const toggleButton = document.createElement('span');
  toggleButton.className = getToggleButtonClasses(props.checked);
  toggleSwitch.appendChild(toggleButton);
  
  toggle.appendChild(toggleSwitch);
  
  container.appendChild(content);
  container.appendChild(toggle);
  
  return container;
}

function getThemeButtonClasses(selected: boolean): string {
  const baseClasses = 'w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200';
  const stateClasses = selected
    ? 'border-primary-500 bg-primary-50 text-primary-900'
    : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50';
  
  return `${baseClasses} ${stateClasses}`;
}

function getToggleSwitchClasses(checked: boolean, disabled?: boolean): string {
  const baseClasses = 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2';
  
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

function getToggleButtonClasses(checked: boolean): string {
  const baseClasses = 'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out';
  const positionClass = checked ? 'translate-x-5' : 'translate-x-0';
  
  return `${baseClasses} ${positionClass}`;
}
