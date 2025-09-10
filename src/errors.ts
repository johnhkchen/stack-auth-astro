/**
 * Custom error types and messages for Stack Auth integration
 * 
 * Provides helpful, actionable error messages for common configuration
 * and runtime issues to improve developer experience.
 */

export class StackAuthConfigurationError extends Error {
  constructor(message: string, public readonly details?: string) {
    super(message);
    this.name = 'StackAuthConfigurationError';
  }
}

export class StackAuthEnvironmentError extends Error {
  constructor(message: string, public readonly missingVariables?: string[]) {
    super(message);
    this.name = 'StackAuthEnvironmentError';
  }
}

export class StackAuthCompatibilityError extends Error {
  constructor(message: string, public readonly requirement?: string) {
    super(message);
    this.name = 'StackAuthCompatibilityError';
  }
}

export class StackAuthIntegrationError extends Error {
  constructor(message: string, public readonly context?: string) {
    super(message);
    this.name = 'StackAuthIntegrationError';
  }
}

/**
 * Error message templates for common configuration issues
 */
export const ERROR_MESSAGES = {
  MISSING_PROJECT_ID: `
🔑 Stack Auth Project ID is required

Missing environment variable: STACK_PROJECT_ID

To fix this:
1. Go to your Stack Auth dashboard: https://app.stack-auth.com
2. Select your project or create a new one
3. Copy your Project ID from the project settings
4. Add it to your environment variables:

   STACK_PROJECT_ID=your_project_id_here

Learn more: https://docs.stack-auth.com/getting-started/setup
`,

  MISSING_PUBLISHABLE_KEY: `
🔑 Stack Auth Publishable Client Key is required

Missing environment variable: STACK_PUBLISHABLE_CLIENT_KEY

To fix this:
1. Go to your Stack Auth dashboard: https://app.stack-auth.com
2. Navigate to API Keys in your project settings
3. Copy your Publishable Client Key
4. Add it to your environment variables:

   STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key_here

Learn more: https://docs.stack-auth.com/getting-started/setup
`,

  MISSING_SECRET_KEY: `
🔑 Stack Auth Secret Server Key is required

Missing environment variable: STACK_SECRET_SERVER_KEY

To fix this:
1. Go to your Stack Auth dashboard: https://app.stack-auth.com
2. Navigate to API Keys in your project settings
3. Copy your Secret Server Key
4. Add it to your environment variables:

   STACK_SECRET_SERVER_KEY=your_secret_key_here

⚠️  Keep this key secret! Never expose it in client-side code.

Learn more: https://docs.stack-auth.com/getting-started/setup
`,

  INVALID_ASTRO_VERSION: `
🚀 Astro version compatibility issue

This integration requires Astro 5.0 or higher.

To fix this:
1. Update Astro to the latest version:
   npm install astro@latest

2. Check your Astro version:
   npx astro --version

Learn more: https://docs.astro.build/en/upgrade-astro/
`,

  REACT_RENDERER_CONFLICT: `
⚛️  React renderer configuration conflict

You have addReactRenderer: true but @astrojs/react is already configured.

To fix this:
1. Set addReactRenderer: false in your Stack Auth integration options, OR
2. Remove @astrojs/react from your Astro config

Example:
// astro.config.mjs
export default defineConfig({
  integrations: [
    astroStackAuth({ addReactRenderer: false }), // Use existing React renderer
    react()
  ]
});
`,

  MISSING_REACT_RENDERER: `
⚛️  React renderer required for Stack Auth UI components

Stack Auth UI components require React renderer support.

To fix this:
1. Enable automatic React renderer (recommended):
   astroStackAuth({ addReactRenderer: true })

2. Or manually add @astrojs/react to your Astro config:
   npm install @astrojs/react
   
   // astro.config.mjs
   import react from '@astrojs/react';
   export default defineConfig({
     integrations: [react(), astroStackAuth()]
   });

Learn more: https://docs.astro.build/en/guides/integrations-guide/react/
`,

  DEVELOPMENT_SETUP_GUIDE: `
🚀 Setting up Stack Auth with Astro

Quick setup guide:

1. Install the integration:
   npm install astro-stack-auth

2. Add to your Astro config:
   // astro.config.mjs
   import { defineConfig } from 'astro/config';
   import astroStackAuth from 'astro-stack-auth';
   
   export default defineConfig({
     integrations: [astroStackAuth()]
   });

3. Set up environment variables:
   STACK_PROJECT_ID=your_project_id
   STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
   STACK_SECRET_SERVER_KEY=your_secret_key

4. Start using Stack Auth:
   // In any .astro file
   ---
   import { getUser } from 'astro-stack-auth/server';
   const user = await getUser(Astro);
   ---
   
   {user ? (
     <p>Welcome, {user.displayName}!</p>
   ) : (
     <a href="/handler/signin">Sign In</a>
   )}

Learn more: https://github.com/your-repo/astro-stack-auth#readme
`
} as const;

/**
 * Helper function to create formatted error message with troubleshooting guide
 */
export function createErrorWithGuide(
  title: string,
  description: string,
  troubleshootingSteps: string[]
): string {
  const steps = troubleshootingSteps
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');

  return `
❌ ${title}

${description}

Troubleshooting steps:
${steps}

Need help? Check the documentation or open an issue:
- Docs: https://github.com/your-repo/astro-stack-auth#readme
- Issues: https://github.com/your-repo/astro-stack-auth/issues
`;
}

/**
 * Helper function to format multiple validation errors
 */
export function createValidationSummary(errors: string[]): string {
  if (errors.length === 0) return '';
  
  const errorList = errors.map(error => `  ❌ ${error}`).join('\n');
  
  return `
🚨 Stack Auth Configuration Issues Found

The following issues need to be resolved:

${errorList}

Please fix these issues and restart your development server.
`;
}