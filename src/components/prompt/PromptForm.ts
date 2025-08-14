// Prompt Form Component
// Clean Architecture - Presentation Layer

import type { Prompt, CreatePromptRequest, UpdatePromptRequest } from '@/types';

export interface PromptFormProps {
  prompt?: Prompt; // For editing existing prompt
  onSubmit: (data: CreatePromptRequest | UpdatePromptRequest) => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  disabled?: boolean;
}

export interface PromptFormData {
  title: string;
  content: string;
  tags: string[];
  categoryId?: string | null;
  description?: string;
}

export function createPromptForm(props: PromptFormProps): HTMLElement {
  const form = document.createElement('form');
  form.className = 'space-y-4';

  // Form state
  const formData: PromptFormData = {
    title: props.prompt?.title || '',
    content: props.prompt?.content || '',
    tags: props.prompt?.tags || [],
    categoryId: props.prompt?.categoryId || null,
    description: props.prompt?.metadata?.description || '',
  };

  // Title field
  const titleGroup = createFormGroup({
    label: 'Title',
    required: true,
    input: {
      type: 'text',
      placeholder: 'Enter prompt title...',
      value: formData.title,
      onChange: (value) => (formData.title = value),
    },
  });
  form.appendChild(titleGroup);

  // Content field
  const contentGroup = createFormGroup({
    label: 'Content',
    required: true,
    textarea: {
      placeholder: 'Enter your prompt content here...',
      value: formData.content,
      onChange: (value) => (formData.content = value),
      rows: 6,
    },
  });
  form.appendChild(contentGroup);

  // Description field
  const descriptionGroup = createFormGroup({
    label: 'Description (optional)',
    textarea: {
      placeholder: 'Brief description of this prompt...',
      value: formData.description || '',
      onChange: (value) => (formData.description = value),
      rows: 2,
    },
  });
  form.appendChild(descriptionGroup);

  // Tags field
  const tagsGroup = createTagsField({
    label: 'Tags',
    tags: formData.tags,
    onTagsChange: (tags) => (formData.tags = tags),
  });
  form.appendChild(tagsGroup);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'flex items-center justify-end space-x-3 pt-4 border-t border-gray-200';

  // Cancel button
  if (props.onCancel) {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className =
      'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
    cancelButton.textContent = props.cancelText || 'Cancel';
    cancelButton.disabled = props.disabled || false;
    cancelButton.addEventListener('click', props.onCancel);
    actions.appendChild(cancelButton);
  }

  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className =
    'px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
  submitButton.textContent = props.submitText || (props.prompt ? 'Update' : 'Create');
  submitButton.disabled = props.disabled || false;
  actions.appendChild(submitButton);

  form.appendChild(actions);

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (!formData.content.trim()) {
      alert('Content is required');
      return;
    }

    // Prepare data
    const submitData: CreatePromptRequest | UpdatePromptRequest = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      tags: formData.tags,
      categoryId: formData.categoryId,
      metadata: {
        description: formData.description?.trim() || undefined,
      },
    };

    props.onSubmit(submitData);
  });

  return form;
}

interface FormGroupProps {
  label: string;
  required?: boolean;
  input?: {
    type: string;
    placeholder?: string;
    value?: string;
    onChange: (value: string) => void;
  };
  textarea?: {
    placeholder?: string;
    value?: string;
    onChange: (value: string) => void;
    rows?: number;
  };
}

function createFormGroup(props: FormGroupProps): HTMLElement {
  const group = document.createElement('div');

  // Label
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 mb-2';
  label.textContent = props.label;
  if (props.required) {
    const required = document.createElement('span');
    required.className = 'text-red-500 ml-1';
    required.textContent = '*';
    label.appendChild(required);
  }
  group.appendChild(label);

  // Input or Textarea
  if (props.input) {
    const input = document.createElement('input');
    input.type = props.input.type;
    input.className =
      'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
    input.placeholder = props.input.placeholder || '';
    input.value = props.input.value || '';
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      props.input?.onChange(target.value);
    });
    group.appendChild(input);
  }

  if (props.textarea) {
    const textarea = document.createElement('textarea');
    textarea.className =
      'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-vertical';
    textarea.placeholder = props.textarea.placeholder || '';
    textarea.value = props.textarea.value || '';
    textarea.rows = props.textarea.rows || 3;
    textarea.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      props.textarea?.onChange(target.value);
    });
    group.appendChild(textarea);
  }

  return group;
}

interface TagsFieldProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

function createTagsField(props: TagsFieldProps): HTMLElement {
  const group = document.createElement('div');

  // Label
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 mb-2';
  label.textContent = props.label;
  group.appendChild(label);

  // Tags container
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'flex flex-wrap gap-2 mb-2 min-h-8';

  function renderTags() {
    tagsContainer.innerHTML = '';

    props.tags.forEach((tag, index) => {
      const tagElement = document.createElement('div');
      tagElement.className =
        'inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full';

      const tagText = document.createElement('span');
      tagText.textContent = tag;
      tagElement.appendChild(tagText);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ml-2 text-blue-600 hover:text-blue-800';
      removeButton.innerHTML = '&times;';
      removeButton.addEventListener('click', () => {
        const newTags = props.tags.filter((_, i) => i !== index);
        props.onTagsChange(newTags);
        renderTags();
      });
      tagElement.appendChild(removeButton);

      tagsContainer.appendChild(tagElement);
    });
  }

  renderTags();
  group.appendChild(tagsContainer);

  // Tag input
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.className =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  tagInput.placeholder = 'Add tags (press Enter to add)...';

  tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = tagInput.value.trim();
      if (value && !props.tags.includes(value)) {
        props.onTagsChange([...props.tags, value]);
        tagInput.value = '';
        renderTags();
      }
    }
  });

  group.appendChild(tagInput);

  return group;
}
