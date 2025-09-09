/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('@stackframe/stack').User | null;
    session: import('@stackframe/stack').Session | null;
  }
}

// Basic Astro types for integration development
declare module 'astro' {
  interface AstroGlobal {
    locals: App.Locals;
  }

  interface APIContext {
    locals: App.Locals;
    redirect: (url: string) => never;
    request: Request;
    params: Record<string, string>;
    url: URL;
  }

  interface AstroIntegrationLogger {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  }

  interface AstroIntegration {
    name: string;
    hooks: {
      'astro:config:setup'?: (params: {
        injectRoute: (options: {
          pattern: string;
          entrypoint: string;
          prerender?: boolean;
        }) => void;
        addMiddleware: (options: {
          entrypoint: string;
          order?: 'pre' | 'post';
        }) => void;
        addRenderer: (options: {
          name: string;
          clientEntrypoint: string;
          serverEntrypoint: string;
        }) => void;
        logger: AstroIntegrationLogger;
      }) => void;
    };
  }
}