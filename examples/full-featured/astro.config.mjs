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
      authPrefix: '/auth', // Custom auth endpoint prefix
      addReactRenderer: true, // Automatically add React renderer (default: true)
      
      // Enable builds while API handler implementation is being developed
      skipValidation: true,  // Task 1.3.2: Enable build integration testing
      
      // Additional Stack Auth options can be configured here
      // See Stack Auth documentation for available options
    })
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});