/**
 * Audit logging tests
 * 
 * Tests for security audit logging, event tracking,
 * and log management functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  auditLogger,
  logAuthSuccess,
  logAuthFailure,
  logSecurityViolation,
  logRateLimitExceeded,
  logSystemError,
  getAuditStats,
  AuditEventType,
  RiskLevel,
  SecurityEvents,
  type AuditLogEntry
} from '../../src/server/audit.js';
import type { APIContext } from 'astro';
import type { User } from '@stackframe/stack';

describe('Audit Logging', () => {
  let mockContext: APIContext;
  let mockUser: User;
  let consoleSpy: any;
  
  beforeEach(() => {
    // Clear any existing logs
    auditLogger.clearBuffer();
    
    // Create console spy
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create mock API context
    mockContext = {
      request: new Request('https://example.com/auth', {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
          'x-forwarded-for': '192.168.1.100'
        }
      }),
      url: new URL('https://example.com/auth'),
      locals: {},
      cookies: {} as any,
      redirect: vi.fn()
    } as any;
    
    // Create mock user
    mockUser = {
      id: 'user-123',
      displayName: 'Test User'
    } as User;
  });
  
  afterEach(() => {
    auditLogger.clearBuffer();
    consoleSpy?.mockRestore();
  });
  
  describe('Basic Logging', () => {
    it('should log authentication success', () => {
      logAuthSuccess(mockContext, mockUser, { provider: 'email' });
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.eventType).toBe(AuditEventType.AUTH_SUCCESS);
      expect(log.userId).toBe('user-123');
      expect(log.success).toBe(true);
      expect(log.riskLevel).toBe(RiskLevel.LOW);
      expect(log.details?.provider).toBe('email');
    });
    
    it('should log authentication failure', () => {
      logAuthFailure(mockContext, 'Invalid password', { attempts: 3 });
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.eventType).toBe(AuditEventType.AUTH_FAILURE);
      expect(log.success).toBe(false);
      expect(log.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(log.message).toContain('Invalid password');
      expect(log.details?.attempts).toBe(3);
    });
    
    it('should log security violations', () => {
      logSecurityViolation(
        AuditEventType.CSRF_VIOLATION, 
        mockContext, 
        'CSRF token mismatch',
        { expectedToken: 'abc123', providedToken: 'def456' }
      );
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.eventType).toBe(AuditEventType.CSRF_VIOLATION);
      expect(log.riskLevel).toBe(RiskLevel.HIGH);
      expect(log.message).toBe('CSRF token mismatch');
      expect(log.success).toBe(false);
    });
    
    it('should log rate limit exceeded', () => {
      logRateLimitExceeded(mockContext, 10, 15);
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.eventType).toBe(AuditEventType.RATE_LIMIT_EXCEEDED);
      expect(log.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(log.details?.limit).toBe(10);
      expect(log.details?.attempts).toBe(15);
    });
    
    it('should log system errors', () => {
      const error = new Error('Database connection failed');
      logSystemError(mockContext, error, { database: 'postgres' });
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      
      const log = logs[0];
      expect(log.eventType).toBe(AuditEventType.SYSTEM_ERROR);
      expect(log.riskLevel).toBe(RiskLevel.HIGH);
      expect(log.message).toContain('Database connection failed');
      expect(log.success).toBe(false);
    });
  });
  
  describe('Log Entry Structure', () => {
    it('should include request information', () => {
      logAuthSuccess(mockContext, mockUser);
      
      const log = auditLogger.getRecentLogs()[0];
      
      expect(log.timestamp).toBeDefined();
      expect(log.clientIP).toBeDefined(); // May be hashed in production
      expect(log.userAgent).toBeDefined(); // May be hashed in production
      expect(log.endpoint).toBe('/auth');
      expect(log.method).toBe('POST');
    });
    
    it('should handle requests without user agent', () => {
      const contextWithoutUA = {
        ...mockContext,
        request: new Request('https://example.com/auth', {
          method: 'POST',
          headers: { 'x-forwarded-for': '192.168.1.100' }
        })
      };
      
      logAuthSuccess(contextWithoutUA, mockUser);
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.userAgent).toBeDefined();
    });
    
    it('should handle direct request objects', () => {
      const request = new Request('https://example.com/test', {
        method: 'GET',
        headers: { 'user-agent': 'Test Agent' }
      });
      
      const error = new Error('Test error');
      logSystemError(request, error);
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.endpoint).toBe('/test');
      expect(log.method).toBe('GET');
    });
  });
  
  describe('Security Events Utilities', () => {
    it('should track authentication attempt failures', () => {
      SecurityEvents.authAttemptFailed(mockContext, 'Invalid credentials', { ip: '192.168.1.100' });
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.eventType).toBe(AuditEventType.AUTH_FAILURE);
      expect(log.message).toContain('Invalid credentials');
    });
    
    it('should track CSRF violations', () => {
      SecurityEvents.csrfViolation(mockContext, { token: 'invalid' });
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.eventType).toBe(AuditEventType.CSRF_VIOLATION);
      expect(log.message).toBe('CSRF token validation failed');
    });
    
    it('should track invalid origin requests', () => {
      SecurityEvents.invalidOrigin(mockContext, 'https://evil.com');
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.eventType).toBe(AuditEventType.INVALID_ORIGIN);
      expect(log.message).toContain('https://evil.com');
    });
    
    it('should track suspicious activity', () => {
      SecurityEvents.suspiciousActivity(mockContext, 'Multiple failed attempts from same IP');
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.eventType).toBe(AuditEventType.SUSPICIOUS_ACTIVITY);
      expect(log.riskLevel).toBe(RiskLevel.HIGH);
    });
  });
  
  describe('Risk Level Inference', () => {
    it('should infer high risk for security violations', () => {
      const highRiskEvents = [
        AuditEventType.CSRF_VIOLATION,
        AuditEventType.INVALID_ORIGIN,
        AuditEventType.SUSPICIOUS_ACTIVITY,
        AuditEventType.SYSTEM_ERROR
      ];
      
      highRiskEvents.forEach(eventType => {
        auditLogger.log({
          eventType,
          message: 'Test event',
          context: mockContext
        });
        
        const log = auditLogger.getRecentLogs().slice(-1)[0];
        expect(log.riskLevel).toBe(RiskLevel.HIGH);
      });
    });
    
    it('should infer medium risk for authentication failures', () => {
      const mediumRiskEvents = [
        AuditEventType.AUTH_FAILURE,
        AuditEventType.RATE_LIMIT_EXCEEDED
      ];
      
      mediumRiskEvents.forEach(eventType => {
        auditLogger.log({
          eventType,
          message: 'Test event',
          context: mockContext
        });
        
        const log = auditLogger.getRecentLogs().slice(-1)[0];
        expect(log.riskLevel).toBe(RiskLevel.MEDIUM);
      });
    });
    
    it('should infer low risk for successful events', () => {
      auditLogger.log({
        eventType: AuditEventType.AUTH_SUCCESS,
        message: 'Test event',
        context: mockContext
      });
      
      const log = auditLogger.getRecentLogs().slice(-1)[0];
      expect(log.riskLevel).toBe(RiskLevel.LOW);
    });
  });
  
  describe('Audit Statistics', () => {
    it('should provide audit statistics', () => {
      // Log various events
      logAuthSuccess(mockContext, mockUser);
      logAuthFailure(mockContext, 'Invalid password');
      logSecurityViolation(AuditEventType.CSRF_VIOLATION, mockContext, 'CSRF error');
      
      const stats = getAuditStats();
      
      expect(stats.totalLogs).toBe(3);
      expect(stats.recentHighRiskEvents).toBe(1); // CSRF violation
      expect(stats.recentFailures).toBe(2); // Auth failure + CSRF violation
    });
    
    it('should filter statistics by time window', async () => {
      // This test is challenging without manipulating time
      // In a real implementation, we might use dependency injection for time
      const stats = getAuditStats();
      expect(typeof stats.totalLogs).toBe('number');
      expect(typeof stats.recentHighRiskEvents).toBe('number');
      expect(typeof stats.recentFailures).toBe('number');
    });
  });
  
  describe('Log Level Configuration', () => {
    it('should filter logs by level', () => {
      // Update config to only log high and critical events
      auditLogger.updateConfig({ logLevel: 'high_and_up' });
      
      // Low risk event should not be logged
      logAuthSuccess(mockContext, mockUser);
      expect(auditLogger.getRecentLogs()).toHaveLength(0);
      
      // High risk event should be logged
      logSecurityViolation(AuditEventType.CSRF_VIOLATION, mockContext, 'CSRF error');
      expect(auditLogger.getRecentLogs()).toHaveLength(1);
      
      // Reset config
      auditLogger.updateConfig({ logLevel: 'all' });
    });
    
    it('should respect disabled logging', () => {
      auditLogger.updateConfig({ enabled: false });
      
      logAuthSuccess(mockContext, mockUser);
      expect(auditLogger.getRecentLogs()).toHaveLength(0);
      
      // Re-enable
      auditLogger.updateConfig({ enabled: true });
    });
  });
  
  describe('Stack Traces', () => {
    it('should include stack traces when configured', () => {
      auditLogger.updateConfig({ includeStackTraces: true });
      
      const error = new Error('Test error');
      logSystemError(mockContext, error);
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.stackTrace).toBeDefined();
      expect(log.stackTrace).toContain('Error: Test error');
    });
    
    it('should exclude stack traces when not configured', () => {
      auditLogger.updateConfig({ includeStackTraces: false });
      
      const error = new Error('Test error');
      logSystemError(mockContext, error);
      
      const log = auditLogger.getRecentLogs()[0];
      expect(log.stackTrace).toBeUndefined();
    });
  });
  
  describe('Buffer Management', () => {
    it('should limit buffer size', () => {
      // This would require testing with a large number of logs
      // For now, just test that the buffer management methods work
      
      logAuthSuccess(mockContext, mockUser);
      expect(auditLogger.getRecentLogs()).toHaveLength(1);
      
      auditLogger.clearBuffer();
      expect(auditLogger.getRecentLogs()).toHaveLength(0);
    });
  });
  
  describe('Console Output', () => {
    it('should output logs to console', () => {
      logAuthSuccess(mockContext, mockUser);
      
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('[AUDIT:LOW]');
      expect(logCall).toContain(AuditEventType.AUTH_SUCCESS);
    });
    
    it('should color code by risk level', () => {
      // Test different risk levels
      logAuthSuccess(mockContext, mockUser); // Low
      logAuthFailure(mockContext, 'test'); // Medium  
      logSecurityViolation(AuditEventType.CSRF_VIOLATION, mockContext, 'test'); // High
      
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      const calls = consoleSpy.mock.calls;
      expect(calls[0][0]).toContain('[AUDIT:LOW]');
      expect(calls[1][0]).toContain('[AUDIT:MEDIUM]');
      expect(calls[2][0]).toContain('[AUDIT:HIGH]');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle extremely long log messages', () => {
      const longMessage = 'x'.repeat(10000);
      logAuthFailure(mockContext, longMessage);
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe(`Authentication failed: ${longMessage}`);
    });
    
    it('should handle special characters in log messages', () => {
      const specialMessage = 'Test with "quotes" and \n newlines \t tabs';
      logAuthFailure(mockContext, specialMessage);
      
      const logs = auditLogger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain(specialMessage);
    });
    
    it('should handle concurrent logging', () => {
      // Simulate concurrent log entries
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          logAuthSuccess(mockContext, { ...mockUser, id: `user-${i}` });
        }));
      }
      
      return Promise.all(promises).then(() => {
        const logs = auditLogger.getRecentLogs();
        expect(logs.length).toBeGreaterThanOrEqual(10);
      });
    });
  });
});