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
    }
  },
  
  // Path resolution for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './tests')
    }
  }
});