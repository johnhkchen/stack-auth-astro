/**
 * Security logging and audit functionality for Stack Auth
 * 
 * Provides structured logging for authentication events, security incidents,
 * and audit trails for compliance and security monitoring.
 */

import { getClientIP, generateSecureHash } from './security.js';
import type { APIContext } from 'astro';
import type { User, Session } from '@stackframe/stack';

// Audit event types
export enum AuditEventType {
  // Authentication events
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  AUTH_LOGOUT = 'auth_logout',
  
  // Session events
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  SESSION_REVOKED = 'session_revoked',
  
  // Security events
  CSRF_VIOLATION = 'csrf_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_ORIGIN = 'invalid_origin',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Account events
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_DELETED = 'account_deleted',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  
  // Administrative events
  PERMISSION_DENIED = 'permission_denied',
  CONFIGURATION_ERROR = 'configuration_error',
  SYSTEM_ERROR = 'system_error'
}

// Risk levels for audit events
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Audit log entry structure
export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  riskLevel: RiskLevel;
  userId?: string;
  sessionId?: string;
  clientIP: string;
  userAgent: string;
  requestId?: string;
  endpoint: string;
  method: string;
  success: boolean;
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
}

// Audit configuration
export interface AuditConfig {
  enabled: boolean;
  logLevel: 'all' | 'medium_and_up' | 'high_and_up' | 'critical_only';
  includeStackTraces: boolean;
  hashSensitiveData: boolean;
  maxLogSize: number; // Maximum log entry size in characters
}

// Default audit configuration
const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enabled: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'medium_and_up' : 'all',
  includeStackTraces: process.env.NODE_ENV !== 'production',
  hashSensitiveData: process.env.NODE_ENV === 'production',
  maxLogSize: 5000
};

/**
 * Audit logger class
 */
class AuditLogger {
  private config: AuditConfig;
  private logBuffer: AuditLogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;
  
  constructor(config: AuditConfig = DEFAULT_AUDIT_CONFIG) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }
  
  /**
   * Log an audit event
   */
  log(entry: Partial<AuditLogEntry> & { 
    eventType: AuditEventType; 
    message: string;
    context?: APIContext;
    request?: Request;
    user?: User | null;
    session?: Session | null;
    error?: Error;
  }): void {
    if (!this.config.enabled) return;
    
    // Check if this event should be logged based on level
    const riskLevel = entry.riskLevel || this.inferRiskLevel(entry.eventType);
    if (!this.shouldLog(riskLevel)) return;
    
    // Build complete audit entry
    const auditEntry = this.buildAuditEntry(entry, riskLevel);
    
    // Add to buffer
    this.addToBuffer(auditEntry);
    
    // Output to console (in production, this would go to a proper logging system)
    this.outputLog(auditEntry);
  }
  
  /**
   * Log authentication success
   */
  logAuthSuccess(context: APIContext, user: User, details?: Record<string, any>): void {
    this.log({
      eventType: AuditEventType.AUTH_SUCCESS,
      message: `User ${user.id} successfully authenticated`,
      context,
      user,
      details
    });
  }
  
  /**
   * Log authentication failure
   */
  logAuthFailure(context: APIContext, reason: string, details?: Record<string, any>): void {
    this.log({
      eventType: AuditEventType.AUTH_FAILURE,
      message: `Authentication failed: ${reason}`,
      riskLevel: RiskLevel.MEDIUM,
      context,
      details
    });
  }
  
  /**
   * Log security violation
   */
  logSecurityViolation(
    eventType: AuditEventType, 
    context: APIContext, 
    message: string, 
    details?: Record<string, any>
  ): void {
    this.log({
      eventType,
      message,
      riskLevel: RiskLevel.HIGH,
      context,
      details
    });
  }
  
  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(context: APIContext, limit: number, attempts: number): void {
    this.log({
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      message: `Rate limit exceeded: ${attempts} attempts (limit: ${limit})`,
      riskLevel: RiskLevel.MEDIUM,
      context,
      details: { limit, attempts }
    });
  }
  
  /**
   * Log system error
   */
  logSystemError(context: APIContext | Request, error: Error, details?: Record<string, any>): void {
    this.log({
      eventType: AuditEventType.SYSTEM_ERROR,
      message: `System error: ${error.message}`,
      riskLevel: RiskLevel.HIGH,
      context: context instanceof Request ? undefined : context,
      request: context instanceof Request ? context : undefined,
      error,
      details
    });
  }
  
  /**
   * Infer risk level from event type
   */
  private inferRiskLevel(eventType: AuditEventType): RiskLevel {
    const highRiskEvents = [
      AuditEventType.CSRF_VIOLATION,
      AuditEventType.INVALID_ORIGIN,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.SYSTEM_ERROR
    ];
    
    const mediumRiskEvents = [
      AuditEventType.AUTH_FAILURE,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.SESSION_EXPIRED,
      AuditEventType.PASSWORD_RESET_REQUESTED
    ];
    
    if (highRiskEvents.includes(eventType)) return RiskLevel.HIGH;
    if (mediumRiskEvents.includes(eventType)) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
  
  /**
   * Check if event should be logged based on configuration
   */
  private shouldLog(riskLevel: RiskLevel): boolean {
    const levelOrder = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const configIndex = levelOrder.indexOf(
      this.config.logLevel === 'all' ? RiskLevel.LOW :
      this.config.logLevel === 'medium_and_up' ? RiskLevel.MEDIUM :
      this.config.logLevel === 'high_and_up' ? RiskLevel.HIGH :
      RiskLevel.CRITICAL
    );
    
    const eventIndex = levelOrder.indexOf(riskLevel);
    return eventIndex >= configIndex;
  }
  
  /**
   * Build complete audit entry
   */
  private buildAuditEntry(
    entry: Partial<AuditLogEntry> & { 
      eventType: AuditEventType; 
      message: string;
      context?: APIContext;
      request?: Request;
      user?: User | null;
      session?: Session | null;
      error?: Error;
    },
    riskLevel: RiskLevel
  ): AuditLogEntry {
    const request = entry.context?.request || entry.request;
    const timestamp = new Date().toISOString();
    
    // Extract request information
    let clientIP = '127.0.0.1';
    let userAgent = 'Unknown';
    let endpoint = '/unknown';
    let method = 'GET';
    
    if (request) {
      clientIP = getClientIP(request);
      userAgent = request.headers.get('user-agent') || 'Unknown';
      endpoint = new URL(request.url).pathname;
      method = request.method;
    }
    
    // Sanitize user agent if needed
    if (this.config.hashSensitiveData) {
      userAgent = generateSecureHash(userAgent).substring(0, 16);
    }
    
    const auditEntry: AuditLogEntry = {
      timestamp,
      eventType: entry.eventType,
      riskLevel,
      userId: entry.user?.id || entry.userId,
      sessionId: entry.session?.id || entry.sessionId,
      clientIP: this.config.hashSensitiveData ? generateSecureHash(clientIP).substring(0, 16) : clientIP,
      userAgent,
      endpoint,
      method,
      success: !entry.error && !entry.eventType.includes('failure') && !entry.eventType.includes('violation'),
      message: entry.message,
      details: entry.details
    };
    
    // Add stack trace if configured and error present
    if (entry.error && this.config.includeStackTraces) {
      auditEntry.stackTrace = entry.error.stack;
    }
    
    return auditEntry;
  }
  
  /**
   * Add entry to buffer
   */
  private addToBuffer(entry: AuditLogEntry): void {
    this.logBuffer.push(entry);
    
    // Trim buffer if it gets too large
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer = this.logBuffer.slice(-this.MAX_BUFFER_SIZE / 2);
    }
  }
  
  /**
   * Output log entry to console (or external logging system)
   */
  private outputLog(entry: AuditLogEntry): void {
    // Truncate if too large
    const logData = JSON.stringify(entry);
    const truncatedLog = logData.length > this.config.maxLogSize ? 
      logData.substring(0, this.config.maxLogSize) + '...[truncated]' : 
      logData;
    
    // Color code by risk level
    const colors = {
      [RiskLevel.LOW]: '\x1b[36m',      // Cyan
      [RiskLevel.MEDIUM]: '\x1b[33m',   // Yellow
      [RiskLevel.HIGH]: '\x1b[31m',     // Red
      [RiskLevel.CRITICAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[entry.riskLevel] || '';
    
    console.log(`${color}[AUDIT:${entry.riskLevel.toUpperCase()}]${reset} ${truncatedLog}`);
  }
  
  /**
   * Get recent audit logs (for debugging/monitoring)
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logBuffer.slice(-limit);
  }
  
  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global audit logger instance
const globalAuditLogger = new AuditLogger();

// Export convenience methods
export const auditLogger = globalAuditLogger;

/**
 * Log authentication success
 */
export function logAuthSuccess(context: APIContext, user: User, details?: Record<string, any>): void {
  auditLogger.logAuthSuccess(context, user, details);
}

/**
 * Log authentication failure
 */
export function logAuthFailure(context: APIContext, reason: string, details?: Record<string, any>): void {
  auditLogger.logAuthFailure(context, reason, details);
}

/**
 * Log security violation
 */
export function logSecurityViolation(
  eventType: AuditEventType,
  context: APIContext,
  message: string,
  details?: Record<string, any>
): void {
  auditLogger.logSecurityViolation(eventType, context, message, details);
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(context: APIContext, limit: number, attempts: number): void {
  auditLogger.logRateLimitExceeded(context, limit, attempts);
}

/**
 * Log system error
 */
export function logSystemError(context: APIContext | Request, error: Error, details?: Record<string, any>): void {
  auditLogger.logSystemError(context, error, details);
}

/**
 * Create audit middleware to automatically log requests
 */
export function createAuditMiddleware(options?: { logAllRequests?: boolean }) {
  return async (context: APIContext, next: () => Promise<Response>): Promise<Response> => {
    const startTime = Date.now();
    let response: Response;
    let error: Error | undefined;
    
    try {
      response = await next();
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Log the request if configured or if there was an error
      if (options?.logAllRequests || error || (response! && response.status >= 400)) {
        auditLogger.log({
          eventType: error ? AuditEventType.SYSTEM_ERROR : AuditEventType.AUTH_SUCCESS,
          message: error ? 
            `Request failed: ${error.message}` : 
            `Request completed with status ${response.status}`,
          context,
          error,
          details: {
            duration,
            statusCode: response?.status,
            responseSize: response?.headers.get('content-length')
          }
        });
      }
    }
    
    return response!;
  };
}

/**
 * Security event tracking utilities
 */
export const SecurityEvents = {
  /**
   * Track failed authentication attempt
   */
  authAttemptFailed: (context: APIContext, reason: string, details?: Record<string, any>) => {
    logAuthFailure(context, reason, details);
  },
  
  /**
   * Track CSRF token violation
   */
  csrfViolation: (context: APIContext, details?: Record<string, any>) => {
    logSecurityViolation(AuditEventType.CSRF_VIOLATION, context, 'CSRF token validation failed', details);
  },
  
  /**
   * Track invalid origin request
   */
  invalidOrigin: (context: APIContext, origin: string, details?: Record<string, any>) => {
    logSecurityViolation(AuditEventType.INVALID_ORIGIN, context, `Invalid origin: ${origin}`, details);
  },
  
  /**
   * Track suspicious activity
   */
  suspiciousActivity: (context: APIContext, reason: string, details?: Record<string, any>) => {
    logSecurityViolation(AuditEventType.SUSPICIOUS_ACTIVITY, context, `Suspicious activity: ${reason}`, details);
  }
};

/**
 * Get audit statistics for monitoring
 */
export function getAuditStats(): {
  totalLogs: number;
  recentHighRiskEvents: number;
  recentFailures: number;
} {
  const recentLogs = auditLogger.getRecentLogs();
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  const recentEntries = recentLogs.filter(log => 
    new Date(log.timestamp).getTime() > oneHourAgo
  );
  
  return {
    totalLogs: recentLogs.length,
    recentHighRiskEvents: recentEntries.filter(log => 
      [RiskLevel.HIGH, RiskLevel.CRITICAL].includes(log.riskLevel)
    ).length,
    recentFailures: recentEntries.filter(log => !log.success).length
  };
}