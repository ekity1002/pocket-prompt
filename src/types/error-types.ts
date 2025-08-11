// Error Management Type Definitions
// TASK-0010: Comprehensive error handling types

export type ErrorLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'CRITICAL';

export interface ErrorContext {
  module: string;
  function?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  reproductionContext?: ReproductionContext;
}

export interface ReproductionContext {
  userAgent: string;
  timestamp: string;
  currentUrl: string;
  userActions: string[];
  systemState: {
    memoryUsage?: string;
    networkStatus?: string;
    [key: string]: any;
  };
}

export interface StructuredLogEntry {
  timestamp: Date;
  level: ErrorLevel;
  module: string;
  function: string;
  message: string;
  stack?: string;
  userAgent: string;
  requestId?: string;
  errorType?: string;
  chromeSpecific?: boolean;
  context?: string;
  performanceImpact?: boolean;
  debugMode: boolean;
  environment: string;
  metadata?: Record<string, any>;
  reproductionContext?: ReproductionContext;
  severity?: string;
  requiresImmedateAttention?: boolean;
}

export interface UserErrorInfo {
  title: string;
  message: string;
  actionable: boolean;
  actions: ErrorAction[];
  severity: 'error' | 'warning' | 'info';
}

export interface ErrorAction {
  label: string;
  action: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType?: Record<string, number>;
  errorsByModule?: Record<string, number>;
  errorRate?: number;
  lastUpdated: string;
}

export type ChromeExtensionError = Error & {
  name: string;
  context?: 'service_worker' | 'content_script' | 'popup' | 'background';
};
