import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import stackAuth from 'astro-stack-auth';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    stackAuth() // Zero config - should use environment variables
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});