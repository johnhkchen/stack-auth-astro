import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import stackAuth from 'astro-stack-auth';

// Check if Stack Auth environment variables are configured
const hasStackAuthConfig = process.env.STACK_PROJECT_ID && 
                          process.env.STACK_PUBLISHABLE_CLIENT_KEY && 
                          process.env.STACK_SECRET_SERVER_KEY;

if (!hasStackAuthConfig) {
  console.warn('⚠️  Stack Auth environment variables not found.');
  console.warn('📝 Please copy .env.example to .env and configure your credentials');
  console.warn('🔗 Get credentials from: https://app.stack-auth.com/dashboard');
}

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    stackAuth({
      // Stack Auth will auto-detect environment variables:
      // STACK_PROJECT_ID, STACK_PUBLISHABLE_CLIENT_KEY, STACK_SECRET_SERVER_KEY
      
      // Optional: Custom endpoint prefix (default: /handler)
      // prefix: '/api/auth'
      
      // Skip validation for alpha testing - all features are implemented
      skipValidation: true
    })
  ],
  output: 'server', // Required for authentication
  adapter: node({
    mode: 'standalone'
  })
});