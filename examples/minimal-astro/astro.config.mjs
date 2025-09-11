import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import stackAuth from 'astro-stack-auth';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    stackAuth({
      // Stack Auth will auto-detect environment variables:
      // STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, STACK_SECRET_SERVER_KEY
    })
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});