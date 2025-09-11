import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    // Main entry points matching package.json exports
    index: 'src/index.ts',
    server: 'src/server.ts', 
    client: 'src/client.ts',
    components: 'src/components.ts',
    middleware: 'src/middleware.ts',
    'build-time-validation': 'src/build-time-validation.ts',
    // API handler for Stack Auth route integration
    'api/handler': 'src/api/handler.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  // Conditional source maps - disable for production builds for smaller output
  sourcemap: options.watch || process.env.NODE_ENV !== 'production',
  outDir: 'dist',
  // Use .cjs extension for CommonJS files when package.json has "type": "module"
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs'
    }
  },
  // Configure Rollup output options to suppress mixed exports warnings
  rollupOptions: {
    output: {
      exports: 'named'
    }
  },
  // Performance optimizations
  esbuildOptions(options) {
    options.chunkNames = 'chunks/[name]-[hash]';
    // Optimize for better tree shaking
    options.treeShaking = true;
    // Use faster target for development
    if (process.env.NODE_ENV !== 'production') {
      options.target = 'es2022';
    }
  },
  // Configure TypeScript to be more permissive for external dependencies
  tsconfig: './tsconfig.build.json',
  external: [
    'astro',
    'astro:middleware',
    '@stackframe/stack',
    '@stackframe/stack-ui',
    'react',
    'react-dom',
    '@astrojs/compiler',
    '@babel/parser',
    '@babel/traverse'
  ],
  // Performance optimizations
  splitting: true, // Enable code splitting for better chunking
  treeshake: true, // Remove unused code
  minify: process.env.NODE_ENV === 'production',
  // Watch mode optimizations
  ...(options.watch && {
    // Skip DTS generation in watch mode for faster rebuilds
    dts: false,
    // Use faster incremental builds
    skipNodeModulesBundle: true,
    onSuccess: async () => {
      console.log('✅ Development build completed successfully');
    },
    // Ignore non-source files for better performance
    ignoreWatch: [
      'dist/**',
      'node_modules/**',
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      'coverage/**',
      '.git/**',
      '**/*.md',
      '**/*.json'
    ]
  }),
  // Production optimizations
  ...(!options.watch && {
    dts: true,
    minifyIdentifiers: process.env.NODE_ENV === 'production',
    keepNames: process.env.NODE_ENV !== 'production'
  })
}));