import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server.ts', 
    'src/client.ts',
    'src/components.ts',
    'src/middleware.ts',
    'src/config.ts',
    'src/types.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'astro',
    'astro:middleware',
    '@stackframe/stack',
    '@stackframe/stack-ui'
  ]
});