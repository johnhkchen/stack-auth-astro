import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import stackAuth from 'astro-stack-auth';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    stackAuth({
      // Environment variables auto-detected:
      // STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, STACK_SECRET_SERVER_KEY
      
      // Optional configuration
      prefix: '/auth', // Custom auth endpoint prefix
      addReactRenderer: true, // Automatically add React renderer (default: true)
      
      // Skip validation during test builds until Sprint 002 features are implemented
      skipValidation: process.env.STACK_AUTH_TEST_MODE === 'true',
      
      // Additional Stack Auth options can be configured here
      // See Stack Auth documentation for available options
    })
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});