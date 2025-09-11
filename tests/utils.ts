import { vi } from 'vitest';
import type { APIContext } from 'astro';

export function createMockAPIContext(overrides: Partial<APIContext> = {}): APIContext {
  return {
    request: new Request('http://localhost:3000/'),
    url: new URL('http://localhost:3000/'),
    params: {},
    props: {},
    redirect: vi.fn(),
    locals: {},
    ...overrides
  } as APIContext;
}

export function createMockUser() {
  return {
    id: 'user_123',
    displayName: 'Test User',
    primaryEmail: 'test@example.com',
    profileImageUrl: 'https://example.com/avatar.jpg'
  };
}

export function createMockSession() {
  return {
    id: 'session_456', 
    userId: 'user_123',
    expiresAt: new Date(Date.now() + 86400000) // 24 hours
  };
}