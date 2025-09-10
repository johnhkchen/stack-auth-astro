import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Environment configuration
    environment: 'node',
    globals: true,
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,tsx,jsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,tsx,jsx}',
        'src/**/*.spec.{js,ts,tsx,jsx}',
        'src/**/index.ts', // Often just re-exports
        'dist/**',
        'node_modules/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // TypeScript support
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json'
    },
    
    // Setup files for mocking and test utilities
    setupFiles: ['./tests/setup.ts'],
    
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose', 'json'],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Server configuration for testing
    server: {
      deps: {
        // Don't externalize these packages in tests
        inline: [
          '@stackframe/stack',
          '@stackframe/stack-ui',
          'astro'
        ]
      }
    },
    
    // Enhanced module resolution for better dependency handling
    define: {
      'import.meta.vitest': 'undefined',
    },
    
    // ESM/CJS compatibility settings
    esbuild: {
      target: 'node18'
    }
  },
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './tests'),
      // Add alias for astro-stack-auth package during testing
      'astro-stack-auth': resolve(__dirname, './src/index.ts'),
      'astro-stack-auth/server': resolve(__dirname, './src/server.ts'),
      'astro-stack-auth/client': resolve(__dirname, './src/client.ts'),
      'astro-stack-auth/components': resolve(__dirname, './src/components.ts'),
      'astro-stack-auth/middleware': resolve(__dirname, './src/middleware.ts')
    },
    // Better module resolution for dependencies
    conditions: ['import', 'module', 'browser', 'default'],
    mainFields: ['module', 'main']
  }
});