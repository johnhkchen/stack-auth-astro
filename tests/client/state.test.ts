/**
 * Tests for client-side authentication state management
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { User, Session } from '@stackframe/stack';
import { getAuthStateManager, initAuthState, type AuthState } from '../../src/client/state.js';

// Mock window and localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Mock user and session data
const mockUser: User = {
  id: 'user-123',
  displayName: 'Test User',
  primaryEmail: 'test@example.com',
  profileImageUrl: null,
  signedUpAt: new Date('2024-01-01'),
  clientMetadata: {},
  serverMetadata: {}
} as User;

const mockSession: Session = {
  id: 'session-123',
  userId: 'user-123',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  createdAt: new Date('2024-01-01')
} as Session;

describe('AuthStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Clear any existing state
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const authState = initAuthState();
      const state = authState.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeGreaterThan(0);
    });

    it('should restore state from localStorage', () => {
      const storedState = {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
        lastUpdated: Date.now() - 1000 // 1 second ago
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      const authState = initAuthState({ persistStorage: true });
      const state = authState.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('astro-stack-auth-state');
    });

    it('should ignore expired stored state', () => {
      const expiredState = {
        user: mockUser,
        session: mockSession,
        isAuthenticated: true,
        lastUpdated: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredState));

      const authState = initAuthState({ persistStorage: true });
      const state = authState.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('astro-stack-auth-state');
    });
  });

  describe('state management', () => {
    it('should set auth data correctly', () => {
      const authState = initAuthState();
      
      authState.setAuthData(mockUser, mockSession);
      const state = authState.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear auth data correctly', () => {
      const authState = initAuthState();
      
      // First set some data
      authState.setAuthData(mockUser, mockSession);
      
      // Then clear it
      authState.clearAuth();
      const state = authState.getState();

      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should set loading state correctly', () => {
      const authState = initAuthState();
      
      authState.setLoading(true);
      expect(authState.getState().isLoading).toBe(true);
      
      authState.setLoading(false);
      expect(authState.getState().isLoading).toBe(false);
    });

    it('should set error state correctly', () => {
      const authState = initAuthState();
      const error = new Error('Test error');
      
      authState.setError(error);
      const state = authState.getState();

      expect(state.error).toBe(error);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('should persist state to localStorage when auth data changes', () => {
      const authState = initAuthState({ persistStorage: true });
      
      authState.setAuthData(mockUser, mockSession);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'astro-stack-auth-state',
        expect.stringContaining('"isAuthenticated":true')
      );
    });

    it('should not persist when persistStorage is disabled', () => {
      const authState = initAuthState({ persistStorage: false });
      
      authState.setAuthData(mockUser, mockSession);
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', () => {
      const authState = initAuthState({ persistStorage: true });
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      expect(() => {
        authState.setAuthData(mockUser, mockSession);
      }).not.toThrow();
    });
  });

  describe('state subscription', () => {
    it('should notify subscribers on state changes', () => {
      const authState = initAuthState();
      const listener = vi.fn();
      
      const unsubscribe = authState.subscribe(listener);
      
      authState.setAuthData(mockUser, mockSession);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          session: mockSession,
          isAuthenticated: true
        })
      );
      
      unsubscribe();
    });

    it('should not notify unsubscribed listeners', () => {
      const authState = initAuthState();
      const listener = vi.fn();
      
      const unsubscribe = authState.subscribe(listener);
      unsubscribe();
      
      authState.setAuthData(mockUser, mockSession);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const authState = initAuthState();
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      authState.subscribe(errorListener);
      authState.subscribe(normalListener);
      
      // Should not throw and should still call other listeners
      expect(() => {
        authState.setAuthData(mockUser, mockSession);
      }).not.toThrow();
      
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('auto refresh', () => {
    it('should start auto refresh when enabled', () => {
      const authState = initAuthState({ 
        autoRefresh: true,
        refreshInterval: 1000
      });
      
      authState.setAuthData(mockUser, mockSession);
      
      // Mock successful refresh
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession })
      });
      
      // Fast forward time
      vi.advanceTimersByTime(1000);
      
      expect(global.fetch).toHaveBeenCalledWith('/handler/session', expect.any(Object));
    });

    it('should not start auto refresh when disabled', () => {
      const authState = initAuthState({ autoRefresh: false });
      
      authState.setAuthData(mockUser, mockSession);
      
      vi.advanceTimersByTime(60000); // 1 minute
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('session refresh', () => {
    it('should refresh session successfully', async () => {
      const authState = initAuthState();
      authState.setAuthData(mockUser, mockSession);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession })
      });
      
      await authState.refreshSession();
      
      expect(global.fetch).toHaveBeenCalledWith('/handler/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
    });

    it('should clear auth on 401 response', async () => {
      const authState = initAuthState();
      authState.setAuthData(mockUser, mockSession);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });
      
      await authState.refreshSession();
      
      const state = authState.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const authState = initAuthState();
      authState.setAuthData(mockUser, mockSession);
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      await authState.refreshSession();
      
      const state = authState.getState();
      expect(state.error).toBeTruthy();
      expect(state.user).toEqual(mockUser); // Should not clear auth on network error
    });
  });

  describe('auth status check', () => {
    it('should check auth status successfully', async () => {
      const authState = initAuthState();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession })
      });
      
      await authState.checkAuthStatus();
      
      const state = authState.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear auth on 401 response', async () => {
      const authState = initAuthState();
      authState.setAuthData(mockUser, mockSession);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });
      
      await authState.checkAuthStatus();
      
      const state = authState.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const authState = initAuthState({ autoRefresh: true });
      
      authState.destroy();
      
      // Should stop timers and clear listeners
      expect(authState.getState()).toBeDefined(); // State should still be accessible
      
      vi.advanceTimersByTime(60000);
      expect(global.fetch).not.toHaveBeenCalled(); // No refresh calls after destroy
    });
  });
});