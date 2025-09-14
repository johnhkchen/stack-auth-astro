import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import stackAuth from 'astro-stack-auth';

// Auto-setup for test mode or missing environment variables
const isTestMode = process.env.STACK_AUTH_TEST_MODE === 'true' || !process.env.STACK_PROJECT_ID;
if (isTestMode) {
  process.env.STACK_PROJECT_ID = process.env.STACK_PROJECT_ID || 'test_project_id_12345';
  process.env.STACK_PUBLISHABLE_CLIENT_KEY = process.env.STACK_PUBLISHABLE_CLIENT_KEY || 'pk_test_mockkey123456789abcdef';
  process.env.STACK_SECRET_SERVER_KEY = process.env.STACK_SECRET_SERVER_KEY || 'sk_test_mocksecret123456789abcdef';
  process.env.STACK_AUTH_TEST_MODE = 'true';
}

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    stackAuth({
      // Stack Auth will auto-detect environment variables:
      // STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, STACK_SECRET_SERVER_KEY
      
      // Skip validation during test builds until Sprint 002 features are implemented
      skipValidation: isTestMode
    })
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});