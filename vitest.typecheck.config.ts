import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Unified esbuild configuration for JSX support
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'node18'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    
    // Test file patterns - focus on type-heavy tests
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      './build/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    
    // Enable TypeScript checking for this config
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json'
    },
    
    // Setup files for mocking and test utilities
    setupFiles: ['./tests/setup.ts'],
    
    // Longer timeouts for type checking
    testTimeout: 15000,
    hookTimeout: 15000,
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Single-threaded for type checking stability
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        minThreads: 1,
        maxThreads: 1
      }
    }
  },
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './tests'),
      'astro-stack-auth': resolve(__dirname, './src/index.ts'),
      'astro-stack-auth/server': resolve(__dirname, './src/server.ts'),
      'astro-stack-auth/client': resolve(__dirname, './src/client.ts'),
      'astro-stack-auth/components': resolve(__dirname, './src/components.ts'),
      'astro-stack-auth/middleware': resolve(__dirname, './src/middleware.ts')
    },
    conditions: ['import', 'module', 'browser', 'default'],
    mainFields: ['module', 'main']
  }
});