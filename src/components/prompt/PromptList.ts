// Prompt List Component
// Clean Architecture - Presentation Layer

import type { Prompt, PromptSearchOptions } from '@/types';
import { createPromptCard } from './PromptCard';

export interface PromptListProps {
  prompts: Prompt[];
  loading?: boolean;
  empty?: {
    title: string;
    description: string;
    action?: {
      text: string;
      onClick: () => void;
    };
  };
  onPromptEdit?: (prompt: Prompt) => void;
  onPromptDelete?: (promptId: string) => void;
  onPromptCopy?: (prompt: Prompt) => void;
  onPromptUse?: (prompt: Prompt) => void;
  onPromptToggleFavorite?: (promptId: string) => void;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

export function createPromptList(props: PromptListProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getListClasses(props);

  // Loading state
  if (props.loading) {
    const loading = createLoadingState();
    container.appendChild(loading);
    return container;
  }

  // Empty state
  if (props.prompts.length === 0) {
    const empty = createEmptyState(props.empty);
    container.appendChild(empty);
    return container;
  }

  // Prompt cards
  props.prompts.forEach((prompt) => {
    const card = createPromptCard({
      prompt,
      onEdit: props.onPromptEdit,
      onDelete: props.onPromptDelete,
      onCopy: props.onPromptCopy,
      onUse: props.onPromptUse,
      onToggleFavorite: props.onPromptToggleFavorite,
      compact: props.compact,
      showActions: props.showActions,
    });
    container.appendChild(card);
  });

  return container;
}

function createLoadingState(): HTMLElement {
  const loading = document.createElement('div');
  loading.className = 'space-y-4';

  // Create skeleton cards
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'bg-white border border-gray-200 rounded-lg p-4 animate-pulse';

    // Title skeleton
    const titleSkeleton = document.createElement('div');
    titleSkeleton.className = 'h-4 bg-gray-300 rounded w-3/4 mb-2';
    skeleton.appendChild(titleSkeleton);

    // Content skeleton
    const contentSkeleton = document.createElement('div');
    contentSkeleton.className = 'space-y-2 mb-4';

    for (let j = 0; j < 3; j++) {
      const line = document.createElement('div');
      line.className = `h-3 bg-gray-200 rounded ${j === 2 ? 'w-1/2' : 'w-full'}`;
      contentSkeleton.appendChild(line);
    }

    skeleton.appendChild(contentSkeleton);

    // Tags skeleton
    const tagsSkeleton = document.createElement('div');
    tagsSkeleton.className = 'flex space-x-2 mb-4';

    for (let k = 0; k < 2; k++) {
      const tag = document.createElement('div');
      tag.className = 'h-6 w-16 bg-gray-200 rounded-full';
      tagsSkeleton.appendChild(tag);
    }

    skeleton.appendChild(tagsSkeleton);

    // Actions skeleton
    const actionsSkeleton = document.createElement('div');
    actionsSkeleton.className = 'flex justify-end space-x-2 pt-2 border-t border-gray-100';

    for (let l = 0; l < 3; l++) {
      const action = document.createElement('div');
      action.className = 'h-8 w-16 bg-gray-200 rounded';
      actionsSkeleton.appendChild(action);
    }

    skeleton.appendChild(actionsSkeleton);
    loading.appendChild(skeleton);
  }

  return loading;
}

function createEmptyState(empty?: PromptListProps['empty']): HTMLElement {
  const emptyState = document.createElement('div');
  emptyState.className = 'text-center py-12';

  // Icon
  const icon = document.createElement('div');
  icon.className = 'mx-auto w-12 h-12 text-gray-400 mb-4';
  icon.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
  `;
  emptyState.appendChild(icon);

  // Title
  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold text-gray-900 mb-2';
  title.textContent = empty?.title || 'No prompts found';
  emptyState.appendChild(title);

  // Description
  const description = document.createElement('p');
  description.className = 'text-gray-600 mb-4';
  description.textContent = empty?.description || 'Start by creating your first prompt.';
  emptyState.appendChild(description);

  // Action button
  if (empty?.action) {
    const actionButton = document.createElement('button');
    actionButton.className =
      'px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';
    actionButton.textContent = empty.action.text;
    actionButton.addEventListener('click', empty.action.onClick);
    emptyState.appendChild(actionButton);
  }

  return emptyState;
}

function getListClasses(props: PromptListProps): string {
  const baseClasses = props.compact ? 'space-y-2' : 'space-y-4';

  return `${baseClasses} ${props.className || ''}`;
}
