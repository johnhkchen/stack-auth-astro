# Token Storage Security Best Practices

## Overview

Secure token storage is critical for maintaining the integrity of your authentication system. This guide covers best practices for storing authentication tokens in both client-side and server-side environments, with a focus on preventing common vulnerabilities like XSS, CSRF, and token theft.

## Table of Contents

- [Client-Side Token Storage](#client-side-token-storage)
- [Server-Side Token Storage](#server-side-token-storage)
- [Security Considerations](#security-considerations)
- [Code Examples](#code-examples)
- [Migration Guide](#migration-guide)

## Client-Side Token Storage

### Why localStorage Should Be Avoided

While `localStorage` is convenient, it poses significant security risks for storing sensitive tokens:

#### Vulnerabilities
- **XSS Attacks**: Any JavaScript code can access `localStorage`, making tokens vulnerable to XSS attacks
- **No Automatic Expiration**: Tokens remain until explicitly removed
- **Cross-Tab Access**: Any script from the same origin can access the data
- **Browser Extensions**: Malicious extensions can read `localStorage` data

```javascript
// ❌ INSECURE: Don't do this
localStorage.setItem('auth_token', token);

// Any XSS vulnerability exposes the token
const stolenToken = localStorage.getItem('auth_token');
```

### Secure Alternatives

#### 1. HttpOnly Secure Cookies (Recommended)

The most secure approach for storing authentication tokens in web applications:

```javascript
// Server-side cookie configuration
app.use(session({
  name: 'stack_auth_session',
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,      // Prevents JavaScript access
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 3600000,     // 1 hour expiration
    path: '/',
    domain: '.yourdomain.com'
  }
}));
```

**Benefits:**
- Inaccessible to JavaScript (XSS protection)
- Automatic inclusion in requests
- Built-in expiration support
- CSRF protection with SameSite attribute

#### 2. Session Storage (Limited Use Cases)

Appropriate for temporary, non-sensitive data that should clear when the tab closes:

```javascript
// ✓ Acceptable for non-sensitive, temporary data
sessionStorage.setItem('ui_preference', 'dark');

// ❌ Still vulnerable to XSS for sensitive data
sessionStorage.setItem('auth_token', token); // Don't do this
```

#### 3. In-Memory Storage

For single-page applications, storing tokens in JavaScript memory provides good security:

```javascript
// Secure in-memory token storage
class TokenStore {
  #token = null;
  
  setToken(token) {
    this.#token = token;
  }
  
  getToken() {
    return this.#token;
  }
  
  clearToken() {
    this.#token = null;
  }
}

const tokenStore = new TokenStore();
```

**Trade-offs:**
- ✅ Not accessible via XSS (if implemented correctly)
- ✅ Automatically cleared on page refresh
- ❌ Requires re-authentication on page refresh
- ❌ Not shared across tabs

### XSS Prevention Strategies

1. **Content Security Policy (CSP)**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none';">
```

2. **Input Sanitization**
```javascript
import DOMPurify from 'dompurify';

// Sanitize all user input
const cleanHTML = DOMPurify.sanitize(userInput);
```

3. **Escape Output**
```javascript
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

## Server-Side Token Storage

### Encrypted Session Storage

Server-side sessions should always encrypt sensitive data:

```javascript
import crypto from 'crypto';

class SecureSessionStore {
  constructor(encryptionKey) {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }
  
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### Key Rotation Strategies

Implement regular key rotation to limit exposure from compromised keys:

```javascript
class KeyRotationManager {
  constructor() {
    this.currentKeyVersion = 2;
    this.keys = {
      1: process.env.ENCRYPTION_KEY_V1, // Previous key
      2: process.env.ENCRYPTION_KEY_V2  // Current key
    };
  }
  
  async rotateKeys(session) {
    if (session.keyVersion < this.currentKeyVersion) {
      // Decrypt with old key
      const data = this.decrypt(session.data, session.keyVersion);
      
      // Re-encrypt with new key
      const encrypted = this.encrypt(data, this.currentKeyVersion);
      
      // Update session
      session.data = encrypted;
      session.keyVersion = this.currentKeyVersion;
      
      return session;
    }
  }
}
```

### Token Refresh Patterns

Implement automatic token refresh to maintain security while providing good UX:

```javascript
class TokenManager {
  constructor(stackClient) {
    this.stackClient = stackClient;
    this.refreshThreshold = 5 * 60 * 1000; // 5 minutes
  }
  
  async getValidToken(session) {
    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    
    // Check if token needs refresh
    if (expiresAt - now < this.refreshThreshold) {
      try {
        const refreshed = await this.stackClient.refreshToken(session.refreshToken);
        
        // Update session with new tokens
        session.accessToken = refreshed.accessToken;
        session.refreshToken = refreshed.refreshToken;
        session.expiresAt = refreshed.expiresAt;
        
        // Save updated session
        await this.saveSession(session);
      } catch (error) {
        // Handle refresh failure
        if (error.code === 'INVALID_REFRESH_TOKEN') {
          // Force re-authentication
          throw new Error('Session expired. Please sign in again.');
        }
        throw error;
      }
    }
    
    return session.accessToken;
  }
}
```

### Secure Key Management

1. **Environment Variables**
```bash
# .env
STACK_SECRET_SERVER_KEY=your-secret-key
ENCRYPTION_KEY=your-encryption-key
SESSION_SECRET=your-session-secret
```

2. **Key Vault Integration**
```javascript
// Azure Key Vault example
import { SecretClient } from '@azure/keyvault-secrets';

class SecureKeyManager {
  constructor() {
    this.client = new SecretClient(
      process.env.KEY_VAULT_URL,
      new DefaultAzureCredential()
    );
  }
  
  async getKey(keyName) {
    const secret = await this.client.getSecret(keyName);
    return secret.value;
  }
}
```

## Security Considerations

### CSRF Protection

Implement CSRF tokens for state-changing operations:

```javascript
// Generate CSRF token
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to validate CSRF
function validateCSRF(req, res, next) {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;
  
  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
}

// Include in forms
app.get('/form', (req, res) => {
  req.session.csrfToken = generateCSRFToken();
  res.render('form', { csrfToken: req.session.csrfToken });
});
```

### HTTPS Requirements

Always enforce HTTPS in production:

```javascript
// Force HTTPS redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// HSTS Header
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

### Cross-Origin Considerations

Configure CORS carefully to prevent token exposure:

```javascript
import cors from 'cors';

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://app.yourdomain.com',
      'https://www.yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));
```

### Token Expiration Handling

Implement proper token expiration handling:

```javascript
class TokenExpirationHandler {
  async makeAuthenticatedRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${await this.getToken()}`
        }
      });
      
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshToken();
        
        // Retry request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${await this.getToken()}`
          }
        });
      }
      
      return response;
    } catch (error) {
      if (error.message.includes('Session expired')) {
        // Redirect to login
        window.location.href = '/login';
      }
      throw error;
    }
  }
}
```

## Code Examples

### Secure Cookie Configuration (Astro + Stack Auth)

```javascript
// src/middleware/auth.js
export async function onRequest(context, next) {
  const { cookies } = context;
  
  // Configure secure cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  };
  
  // Set secure session cookie
  if (context.locals.session) {
    cookies.set('stack_auth_session', context.locals.session.id, cookieOptions);
  }
  
  return next();
}
```

### Token Refresh Implementation

```javascript
// src/lib/auth/token-refresh.js
export class TokenRefreshManager {
  constructor(stackClient) {
    this.stackClient = stackClient;
    this.refreshPromise = null;
  }
  
  async ensureValidToken(session) {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    const shouldRefresh = this.shouldRefreshToken(session);
    
    if (shouldRefresh) {
      this.refreshPromise = this.refreshToken(session)
        .finally(() => {
          this.refreshPromise = null;
        });
      
      return this.refreshPromise;
    }
    
    return session;
  }
  
  shouldRefreshToken(session) {
    if (!session?.expiresAt) return false;
    
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    
    return expiresAt - now < bufferTime;
  }
  
  async refreshToken(session) {
    try {
      const response = await this.stackClient.refreshToken({
        refreshToken: session.refreshToken
      });
      
      // Update session with new tokens
      return {
        ...session,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Session expired. Please sign in again.');
    }
  }
}
```

### Error Handling for Expired Tokens

```javascript
// src/lib/auth/error-handler.js
export function createAuthErrorHandler(redirectUrl = '/signin') {
  return function handleAuthError(error) {
    if (error.code === 'TOKEN_EXPIRED' || 
        error.code === 'INVALID_TOKEN' ||
        error.message.includes('Session expired')) {
      
      // Clear any stored auth data
      if (typeof window !== 'undefined') {
        // Clear cookies
        document.cookie = 'stack_auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${redirectUrl}?returnUrl=${returnUrl}`;
      } else {
        // Server-side redirect
        throw new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl
          }
        });
      }
    }
    
    // Re-throw other errors
    throw error;
  };
}
```

## Migration Guide

### Migrating from localStorage to Secure Cookies

#### Step 1: Identify Current Token Storage

```javascript
// Audit your codebase for localStorage usage
// Search for patterns like:
// - localStorage.setItem('token', ...)
// - localStorage.getItem('token')
// - localStorage.removeItem('token')
```

#### Step 2: Implement Migration Logic

```javascript
// src/lib/auth/migration.js
export async function migrateFromLocalStorage(stackClient) {
  // Check for existing localStorage token
  const oldToken = localStorage.getItem('auth_token');
  
  if (oldToken) {
    try {
      // Validate the token is still valid
      const session = await stackClient.validateToken(oldToken);
      
      if (session.valid) {
        // Create secure session on server
        await fetch('/api/auth/migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${oldToken}`
          },
          credentials: 'include' // Include cookies
        });
        
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        console.log('Successfully migrated to secure cookie storage');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      // Clear invalid tokens
      localStorage.clear();
    }
  }
}
```

#### Step 3: Update Authentication Flow

```javascript
// Before - Using localStorage
class OldAuthService {
  login(credentials) {
    return fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('auth_token', data.token);
      return data;
    });
  }
}

// After - Using secure cookies
class SecureAuthService {
  login(credentials) {
    return fetch('/api/login', {
      method: 'POST',
      credentials: 'include', // Important: include cookies
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })
    .then(res => res.json());
    // Token is now stored in httpOnly cookie by server
  }
}
```

#### Step 4: Update API Calls

```javascript
// Before - Manual token inclusion
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});

// After - Automatic cookie inclusion
fetch('/api/data', {
  credentials: 'include' // Cookies sent automatically
});
```

#### Step 5: Deploy Migration

1. **Deploy server-side changes first** (cookie handling, migration endpoint)
2. **Deploy client-side changes** with migration logic
3. **Monitor for migration success** via logging/analytics
4. **Remove migration code** after sufficient time (e.g., 30 days)

### Security Checklist

Before deploying your token storage implementation, verify:

- [ ] All tokens stored in httpOnly secure cookies
- [ ] HTTPS enforced in production
- [ ] CSRF protection implemented
- [ ] XSS prevention measures in place
- [ ] Token expiration and refresh logic working
- [ ] Proper error handling for expired sessions
- [ ] No sensitive data in localStorage/sessionStorage
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS properly configured
- [ ] Key rotation strategy implemented
- [ ] Audit logging for authentication events
- [ ] Rate limiting on authentication endpoints

## Additional Resources

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Stack Auth Security Documentation](https://docs.stack-auth.com/security)
- [MDN Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)