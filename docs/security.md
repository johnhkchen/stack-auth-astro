# Stack Auth Astro Security Guide

This guide covers security best practices, configurations, and vulnerability mitigation strategies for the Stack Auth Astro integration.

## Table of Contents

- [Security Features](#security-features)
- [Configuration](#configuration)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [CSRF Protection](#csrf-protection)
- [Session Security](#session-security)
- [Security Headers](#security-headers)
- [Audit Logging](#audit-logging)
- [Best Practices](#best-practices)
- [Vulnerability Mitigation](#vulnerability-mitigation)
- [Monitoring and Alerting](#monitoring-and-alerting)

## Security Features

The Stack Auth Astro integration includes comprehensive security measures:

### Built-in Security Features

- **Rate Limiting**: Protects against brute force attacks and API abuse
- **Input Validation**: Sanitizes and validates all user inputs
- **CSRF Protection**: Prevents cross-site request forgery attacks
- **Session Security**: Secure session handling with encryption
- **Security Headers**: Comprehensive HTTP security headers
- **Audit Logging**: Complete audit trails for security events
- **Origin Validation**: Validates request origins to prevent unauthorized access
- **Bot Detection**: Identifies and handles automated requests

## Configuration

### Environment Variables

```bash
# Required Stack Auth credentials
STACK_PROJECT_ID=your-project-id
STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key
STACK_SECRET_SERVER_KEY=your-secret-key

# Optional security configuration
STACK_AUTH_PREFIX=/handler
NODE_ENV=production
```

### Security Options

When using server-side functions, you can enable additional security measures:

```typescript
import { getUser, requireAuth } from 'astro-stack-auth/server';

// Enable security validation
const user = await getUser(context, {
  requireSecureTransport: true,  // Require HTTPS in production
  validateOrigin: true,          // Validate request origin
  allowedOrigins: ['https://yourdomain.com'],
  requireCSRF: true             // Require CSRF token
});

// Enhanced authentication with security
const authenticatedUser = await requireAuth(context, {
  signInUrl: '/auth/signin',
  validateOrigin: true,
  allowedOrigins: ['https://yourdomain.com'],
  requireCSRF: false  // Usually not needed for page requests
});
```

## Rate Limiting

The integration includes sophisticated rate limiting to prevent abuse:

### Default Limits

- **Authentication Endpoints**: 20 attempts per 15 minutes
- **Password Reset**: 5 attempts per hour
- **General API**: 100 requests per 15 minutes
- **Sensitive Operations**: 3 attempts per hour

### Configuration

Rate limiting is applied automatically but can be customized:

```typescript
import { createRateLimitMiddleware, RATE_LIMIT_CONFIGS } from 'astro-stack-auth/server/rate-limiting';

// Custom rate limiting
const customLimit = {
  windowMs: 10 * 60 * 1000,  // 10 minutes
  maxRequests: 50,           // 50 requests
  skipSuccessfulRequests: true
};

const rateLimiter = createRateLimitMiddleware(customLimit);
```

### Rate Limiting Headers

Responses include rate limiting information:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2023-10-01T10:15:00.000Z
```

## Input Validation

All inputs are validated and sanitized:

### Automatic Validation

- **XSS Prevention**: Removes HTML/script injection characters
- **Length Limits**: Enforces maximum input lengths
- **URL Validation**: Validates redirect URLs against open redirect attacks
- **Control Character Removal**: Strips dangerous control characters

### Manual Validation

```typescript
import { sanitizeInput, validateRedirectURL } from 'astro-stack-auth/server/security';

// Sanitize user input
const cleanInput = sanitizeInput(userInput);

// Validate redirect URLs
const safeRedirectUrl = validateRedirectURL(redirectUrl, ['https://yourdomain.com']);
```

## CSRF Protection

Cross-Site Request Forgery protection is available for sensitive operations:

### Token Generation

```typescript
import { generateCSRFToken } from 'astro-stack-auth/server/security';

const csrfToken = generateCSRFToken();
```

### Token Validation

CSRF tokens are validated automatically when enabled:

```typescript
// Enable CSRF protection
const user = await requireAuth(context, {
  requireCSRF: true,
  allowedOrigins: ['https://yourdomain.com']
});
```

### Implementation in Forms

```html
<!-- Include CSRF token in forms -->
<form method="post">
  <input type="hidden" name="csrf_token" value={csrfToken} />
  <!-- form fields -->
</form>
```

Or use headers:

```javascript
fetch('/api/sensitive-action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

## Session Security

Sessions are secured with multiple layers of protection:

### Secure Cookies

- **HttpOnly**: Prevents XSS access to session cookies
- **Secure**: Requires HTTPS in production
- **SameSite**: Prevents CSRF attacks
- **Path Restrictions**: Limits cookie scope

### Session Validation

```typescript
// Session validation with security checks
const session = await getSession(context, {
  requireSecureTransport: true,
  validateOrigin: true
});
```

### Session Expiration

Sessions automatically expire and are cleaned up:

- **Inactive Sessions**: Expire after period of inactivity
- **Absolute Timeout**: Maximum session lifetime
- **Cleanup**: Expired sessions are automatically removed

## Security Headers

Comprehensive security headers are automatically applied:

### Default Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Custom Headers

```typescript
import { addSecurityHeaders } from 'astro-stack-auth/server/security';

// Add custom security headers
const response = new Response(data);
addSecurityHeaders(response.headers, {
  'Content-Security-Policy': "default-src 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});
```

## Audit Logging

Comprehensive audit logging tracks all security events:

### Automatic Logging

- **Authentication Events**: Success/failure with details
- **Security Violations**: CSRF, origin validation, rate limiting
- **System Errors**: Unexpected errors and exceptions
- **Suspicious Activity**: Potential security threats

### Log Levels

- **LOW**: Routine operations (successful auth)
- **MEDIUM**: Failed attempts and rate limiting
- **HIGH**: Security violations and system errors
- **CRITICAL**: Major security incidents

### Custom Logging

```typescript
import { logAuthFailure, logSecurityViolation, AuditEventType } from 'astro-stack-auth/server/audit';

// Log custom security events
logSecurityViolation(
  AuditEventType.SUSPICIOUS_ACTIVITY,
  context,
  'Multiple failed login attempts detected',
  { attempts: 5, timeframe: '5 minutes' }
);
```

### Log Configuration

```typescript
import { auditLogger } from 'astro-stack-auth/server/audit';

// Configure logging
auditLogger.updateConfig({
  enabled: true,
  logLevel: 'medium_and_up',
  includeStackTraces: false,
  hashSensitiveData: true
});
```

## Best Practices

### Production Deployment

1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Keep credentials secure
3. **Rate Limiting**: Monitor and adjust limits based on usage
4. **Log Monitoring**: Set up alerts for security events
5. **Regular Updates**: Keep dependencies updated

### Development

1. **Debug Mode**: Use debug parameters for development
2. **Test Security**: Test rate limiting and validation
3. **Audit Logs**: Review logs for potential issues
4. **Security Headers**: Verify headers are applied correctly

### Code Security

```typescript
// Good: Use security options
const user = await requireAuth(context, {
  validateOrigin: true,
  allowedOrigins: ['https://yourdomain.com']
});

// Good: Validate inputs
const cleanRedirect = validateRedirectURL(userRedirect);

// Good: Handle security errors
try {
  const user = await requireAuth(context);
} catch (error) {
  if (error instanceof SecurityError) {
    // Handle security violations appropriately
  }
}
```

## Vulnerability Mitigation

### OWASP Top 10 Protection

1. **Injection**: Input validation and sanitization
2. **Broken Authentication**: Secure session management
3. **Sensitive Data Exposure**: Proper encryption and headers
4. **XML External Entities (XXE)**: Not applicable (no XML processing)
5. **Broken Access Control**: Authentication and authorization checks
6. **Security Misconfiguration**: Secure defaults and configuration
7. **Cross-Site Scripting (XSS)**: Input sanitization and CSP headers
8. **Insecure Deserialization**: Secure token handling
9. **Components with Known Vulnerabilities**: Regular dependency updates
10. **Insufficient Logging & Monitoring**: Comprehensive audit logging

### Common Attacks

#### Brute Force Attacks
- **Protection**: Rate limiting on authentication endpoints
- **Detection**: Audit logging tracks repeated failures
- **Response**: Automatic blocking with exponential backoff

#### Session Hijacking
- **Protection**: Secure cookies and HTTPS
- **Detection**: Session validation and regeneration
- **Response**: Automatic session invalidation

#### CSRF Attacks
- **Protection**: CSRF token validation
- **Detection**: Origin header validation
- **Response**: Request blocking and logging

#### Open Redirect
- **Protection**: URL validation against allowed origins
- **Detection**: Redirect URL sanitization
- **Response**: Safe fallback URLs

## Monitoring and Alerting

### Security Metrics

Monitor these key security metrics:

```typescript
import { getAuditStats } from 'astro-stack-auth/server/audit';

const stats = getAuditStats();
// stats.totalLogs
// stats.recentHighRiskEvents
// stats.recentFailures
```

### Alert Conditions

Set up alerts for:

- High number of authentication failures
- Rate limiting violations
- Security header violations  
- Suspicious activity patterns
- System errors

### Log Analysis

Review audit logs regularly for:

- Unusual access patterns
- Geographic anomalies
- Time-based anomalies
- User agent patterns
- IP address patterns

### Response Procedures

1. **High Risk Events**: Immediate investigation
2. **Rate Limit Exceeded**: Check for legitimate traffic spikes
3. **Authentication Failures**: Look for brute force patterns
4. **System Errors**: Check application health and dependencies

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables properly secured
- [ ] Rate limiting configured appropriately
- [ ] Security headers enabled
- [ ] Audit logging configured and monitored
- [ ] Input validation tested
- [ ] CSRF protection implemented where needed
- [ ] Session security configured
- [ ] Regular security updates scheduled
- [ ] Security incident response plan in place

## Support and Updates

- **Security Updates**: Monitor for security patches
- **Vulnerability Reports**: Report issues responsibly
- **Documentation**: Keep security documentation updated
- **Training**: Ensure team understands security practices

For security concerns or questions, refer to the project's security policy and reporting guidelines.