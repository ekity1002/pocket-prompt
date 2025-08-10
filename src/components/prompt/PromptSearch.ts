// Prompt Search Component
// Clean Architecture - Presentation Layer

import type { PromptSearchOptions } from '@/types';

export interface PromptSearchProps {
  onSearch: (options: PromptSearchOptions) => void;
  onClear?: () => void;
  placeholder?: string;
  availableTags?: string[];
  loading?: boolean;
  className?: string;
}

export function createPromptSearch(props: PromptSearchProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getSearchClasses(props);
  
  // Search state
  let searchOptions: PromptSearchOptions = {
    query: '',
    tags: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  };
  
  // Search input
  const searchGroup = document.createElement('div');
  searchGroup.className = 'relative flex-1';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  searchInput.placeholder = props.placeholder || 'Search prompts...';
  searchInput.addEventListener('input', debounce((e) => {
    const target = e.target as HTMLInputElement;
    searchOptions.query = target.value;
    props.onSearch(searchOptions);
  }, 300));
  
  // Search icon
  const searchIcon = document.createElement('div');
  searchIcon.className = 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none';
  searchIcon.innerHTML = `
    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
  `;
  
  searchGroup.appendChild(searchIcon);
  searchGroup.appendChild(searchInput);
  
  // Main search row
  const mainRow = document.createElement('div');
  mainRow.className = 'flex items-center space-x-3 mb-3';
  mainRow.appendChild(searchGroup);
  
  // Clear button
  if (props.onClear) {
    const clearButton = document.createElement('button');
    clearButton.className = 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg';
    clearButton.textContent = 'Clear';
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      searchOptions = {
        query: '',
        tags: [],
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };
      updateTagFilters();
      updateSortSelect();
      props.onClear?.();
    });
    mainRow.appendChild(clearButton);
  }
  
  container.appendChild(mainRow);
  
  // Filters row
  const filtersRow = document.createElement('div');
  filtersRow.className = 'flex items-center space-x-4';
  
  // Tags filter
  if (props.availableTags && props.availableTags.length > 0) {
    const tagsFilter = document.createElement('div');
    tagsFilter.className = 'flex items-center space-x-2';
    
    const tagsLabel = document.createElement('span');
    tagsLabel.className = 'text-sm font-medium text-gray-700';
    tagsLabel.textContent = 'Tags:';
    tagsFilter.appendChild(tagsLabel);
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'flex flex-wrap gap-1';
    
    function updateTagFilters() {
      tagsContainer.innerHTML = '';
      
      props.availableTags?.forEach(tag => {
        const tagButton = document.createElement('button');
        tagButton.className = getTagButtonClasses(
          searchOptions.tags?.includes(tag) || false
        );
        tagButton.textContent = tag;
        tagButton.addEventListener('click', () => {
          if (searchOptions.tags?.includes(tag)) {
            searchOptions.tags = searchOptions.tags.filter(t => t !== tag);
          } else {
            searchOptions.tags = [...(searchOptions.tags || []), tag];
          }
          updateTagFilters();
          props.onSearch(searchOptions);
        });
        tagsContainer.appendChild(tagButton);
      });
    }
    
    updateTagFilters();
    tagsFilter.appendChild(tagsContainer);
    filtersRow.appendChild(tagsFilter);
  }
  
  // Sort options
  const sortGroup = document.createElement('div');
  sortGroup.className = 'flex items-center space-x-2';
  
  const sortLabel = document.createElement('span');
  sortLabel.className = 'text-sm font-medium text-gray-700';
  sortLabel.textContent = 'Sort:';
  sortGroup.appendChild(sortLabel);
  
  const sortSelect = document.createElement('select');
  sortSelect.className = 'text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500';
  
  const sortOptions = [
    { value: 'updatedAt-desc', label: 'Recently updated' },
    { value: 'createdAt-desc', label: 'Recently created' },
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
    { value: 'usageCount-desc', label: 'Most used' },
    { value: 'lastUsedAt-desc', label: 'Recently used' },
  ];
  
  sortOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    sortSelect.appendChild(optionElement);
  });
  
  sortSelect.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const [sortBy, sortOrder] = target.value.split('-') as [string, 'asc' | 'desc'];
    searchOptions.sortBy = sortBy as any;
    searchOptions.sortOrder = sortOrder;
    props.onSearch(searchOptions);
  });
  
  function updateSortSelect() {
    const value = `${searchOptions.sortBy}-${searchOptions.sortOrder}`;
    sortSelect.value = value;
  }
  
  updateSortSelect();
  sortGroup.appendChild(sortSelect);
  filtersRow.appendChild(sortGroup);
  
  container.appendChild(filtersRow);
  
  return container;
}

function getSearchClasses(props: PromptSearchProps): string {
  const baseClasses = 'bg-white border border-gray-200 rounded-lg p-4';
  return `${baseClasses} ${props.className || ''}`;
}

function getTagButtonClasses(active: boolean): string {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500';
  const stateClasses = active
    ? 'bg-primary-100 text-primary-800'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  
  return `${baseClasses} ${stateClasses}`;
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
