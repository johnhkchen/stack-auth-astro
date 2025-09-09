import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Main entry points matching package.json exports
    index: 'src/index.ts',
    server: 'src/server.ts', 
    client: 'src/client.ts',
    components: 'src/components.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  // Configure TypeScript to be more permissive for external dependencies
  tsconfig: './tsconfig.build.json',
  external: [
    'astro',
    'astro:middleware',
    '@stackframe/stack',
    '@stackframe/stack-ui',
    'react',
    'react-dom'
  ]
});