# Stack Auth REST API Migration Plan

## Current Architecture Issues
- `@stackframe/stack` is tightly coupled with Next.js (imports `next/navigation`)
- This causes middleware loading errors in Astro
- The SDK wasn't designed to be framework-agnostic

## Proposed Solution: REST API + React UI Components

### Key Discoveries

1. **`@stackframe/stack-ui` is independent**
   - NO dependency on Next.js or `@stackframe/stack`
   - Only requires React, React DOM, and UI libraries (Radix UI)
   - Can be used standalone with proper context

2. **Stack Auth REST API Structure**
   - Base URL: `{baseUrl}/api/v1`
   - Authentication Headers:
     ```
     X-Stack-Project-Id: {projectId}
     X-Stack-Access-Token: {accessToken}
     X-Stack-Refresh-Token: {refreshToken}
     X-Stack-Publishable-Client-Key: {clientKey}
     X-Stack-Secret-Server-Key: {serverKey}
     X-Stack-Access-Type: client|server|admin
     ```

3. **Known Endpoints** (from interface analysis)
   - `/auth/oauth/token` - Token refresh
   - `/auth/password/send-reset-code` - Password reset
   - `/contact-channels/send-verification-code` - Email verification
   - `/auth/otp/send-sign-in-code` - Magic link
   - `/users/me` - Get current user
   - `/health` - Health check

## Migration Steps

### Phase 1: Create REST API Client
```typescript
// src/rest-api/client.ts
class StackAuthRestClient {
  constructor(private config: {
    baseUrl: string;
    projectId: string;
    publishableClientKey: string;
    secretServerKey?: string;
  }) {}

  async getUser(accessToken: string): Promise<User | null> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/users/me`, {
      headers: {
        'X-Stack-Project-Id': this.config.projectId,
        'X-Stack-Access-Token': accessToken,
        'X-Stack-Secret-Server-Key': this.config.secretServerKey,
        'X-Stack-Access-Type': 'server'
      }
    });
    
    if (!response.ok) return null;
    return response.json();
  }
  
  // ... other methods
}
```

### Phase 2: Update Server-Side Code
Replace `StackServerApp` with REST client:
```typescript
// server.ts
export async function getUser(context: APIContext): Promise<User | null> {
  const client = new StackAuthRestClient(getConfig());
  const token = extractTokenFromCookie(context);
  return client.getUser(token);
}
```

### Phase 3: Create Custom React Provider
```typescript
// src/components/provider.tsx
import { createContext } from 'react';
import type { User } from '../types';

export function StackAuthProvider({ children, config }) {
  // Implement auth state management
  // Use REST API for all operations
  
  return (
    <StackContext.Provider value={authState}>
      {children}
    </StackContext.Provider>
  );
}
```

### Phase 4: Wire UI Components
```typescript
// components.ts
export { SignIn, SignUp, UserButton } from '@stackframe/stack-ui';
export { StackAuthProvider } from './provider';
```

## Benefits

1. **No Next.js dependency** - Eliminates the root cause of errors
2. **Lighter bundle** - Only includes what we need
3. **Framework agnostic** - True Astro integration
4. **Better control** - Direct REST API calls
5. **Maintainable** - Clear separation of concerns

## Implementation Priority

1. **High Priority**
   - Token extraction from cookies
   - User/session fetching via REST
   - Basic authentication flow

2. **Medium Priority**
   - Token refresh logic
   - Custom React provider
   - Error handling

3. **Low Priority**
   - Advanced features (OAuth, magic links)
   - Performance optimizations
   - Caching strategies

## Next Steps

1. Start with a minimal REST client for `getUser` and `getSession`
2. Test that UI components work with custom provider
3. Gradually migrate all SDK calls to REST
4. Remove `@stackframe/stack` dependency entirely