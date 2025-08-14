// Container Layout Component
// Clean Architecture - Presentation Layer

export interface ContainerProps {
  children: HTMLElement[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  background?: boolean;
  border?: boolean;
  shadow?: boolean;
}

export function createContainer(props: ContainerProps): HTMLElement {
  const container = document.createElement('div');
  container.className = getContainerClasses(props);

  // Add children
  props.children.forEach((child) => {
    container.appendChild(child);
  });

  return container;
}

function getContainerClasses(props: ContainerProps): string {
  const baseClasses = 'mx-auto';

  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  // Padding classes
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  const maxWidth = props.maxWidth || 'full';
  const padding = props.padding || 'md';

  const classes = [baseClasses, maxWidthClasses[maxWidth], paddingClasses[padding]];

  // Optional styling
  if (props.background) {
    classes.push('bg-white');
  }

  if (props.border) {
    classes.push('border border-gray-200 rounded-lg');
  }

  if (props.shadow) {
    classes.push('shadow-sm');
  }

  if (props.className) {
    classes.push(props.className);
  }

  return classes.join(' ');
}
