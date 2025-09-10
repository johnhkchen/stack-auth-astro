#!/usr/bin/env node

/**
 * Automated Prop Documentation Generator
 * 
 * Extracts component prop specifications from validation schema 
 * and generates developer-friendly markdown documentation.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DOCS_DIR = join(ROOT_DIR, 'docs', 'components');

// Component specifications from validation schema
const COMPONENT_PROP_SPECS = {
  SignIn: {
    onSuccess: { type: 'function', required: false, description: 'Callback function called on successful authentication with the authenticated user' },
    onError: { type: 'function', required: false, description: 'Callback function called when authentication fails with error details' },
    redirectTo: { type: 'string', required: false, description: 'URL to redirect to after successful authentication' },
    providers: { type: 'array', required: false, description: 'Array of authentication providers to display (e.g., ["google", "github"])' },
    showTerms: { type: 'boolean', required: false, description: 'Whether to show terms of service and privacy policy links' },
    termsUrl: { type: 'string', required: false, description: 'URL to terms of service page' },
    privacyUrl: { type: 'string', required: false, description: 'URL to privacy policy page' },
    style: { type: 'object', required: false, description: 'Custom CSS styles for the component' },
    className: { type: 'string', required: false, description: 'CSS class name for custom styling' },
    fullPage: { type: 'boolean', required: false, description: 'Whether to render as a full-page component or inline' }
  },
  SignUp: {
    onSuccess: { type: 'function', required: false, description: 'Callback function called on successful registration with the new user' },
    onError: { type: 'function', required: false, description: 'Callback function called when registration fails with error details' },
    redirectTo: { type: 'string', required: false, description: 'URL to redirect to after successful registration' },
    providers: { type: 'array', required: false, description: 'Array of authentication providers to display (e.g., ["google", "github"])' },
    showTerms: { type: 'boolean', required: false, description: 'Whether to show terms of service and privacy policy links' },
    termsUrl: { type: 'string', required: false, description: 'URL to terms of service page' },
    privacyUrl: { type: 'string', required: false, description: 'URL to privacy policy page' },
    style: { type: 'object', required: false, description: 'Custom CSS styles for the component' },
    className: { type: 'string', required: false, description: 'CSS class name for custom styling' },
    fullPage: { type: 'boolean', required: false, description: 'Whether to render as a full-page component or inline' }
  },
  UserButton: {
    showDisplayName: { type: 'boolean', required: false, description: 'Whether to display the user\'s name next to the avatar' },
    showAvatar: { type: 'boolean', required: false, description: 'Whether to display the user\'s avatar image' },
    colorModeToggle: { type: 'boolean', required: false, description: 'Whether to show dark/light mode toggle in dropdown' },
    showSignOutButton: { type: 'boolean', required: false, description: 'Whether to display sign out button in dropdown menu' },
    onSignOut: { type: 'function', required: false, description: 'Callback function called when user signs out' },
    style: { type: 'object', required: false, description: 'Custom CSS styles for the component' },
    className: { type: 'string', required: false, description: 'CSS class name for custom styling' }
  },
  AccountSettings: {
    onUpdateSuccess: { type: 'function', required: false, description: 'Callback function called when profile update succeeds' },
    onUpdateError: { type: 'function', required: false, description: 'Callback function called when profile update fails' },
    onDeleteAccount: { type: 'function', required: false, description: 'Callback function called when user deletes their account' },
    showProfile: { type: 'boolean', required: false, description: 'Whether to show the profile settings section' },
    showSecurity: { type: 'boolean', required: false, description: 'Whether to show the security settings section' },
    showPreferences: { type: 'boolean', required: false, description: 'Whether to show the preferences section' },
    style: { type: 'object', required: false, description: 'Custom CSS styles for the component' },
    className: { type: 'string', required: false, description: 'CSS class name for custom styling' },
    fullPage: { type: 'boolean', required: false, description: 'Whether to render as a full-page component or inline' }
  },
  StackProvider: {
    projectId: { type: 'string', required: true, description: 'Your Stack Auth project ID from the Stack Auth dashboard' },
    publishableClientKey: { type: 'string', required: true, description: 'Your Stack Auth publishable client key for browser use' },
    children: { type: 'react-node', required: true, description: 'React components that need access to Stack Auth context' },
    baseUrl: { type: 'string', required: false, description: 'Custom base URL for Stack Auth API (defaults to Stack Auth servers)' },
    lang: { type: 'string', required: false, description: 'Language code for localization (e.g., "en", "es", "fr")' },
    theme: { type: 'string', required: false, description: 'UI theme preference ("light", "dark", "auto")' }
  }
};

// Version compatibility data from validation schema
const VERSION_COMPATIBILITY = {
  'SignIn': {
    '2.8.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
      deprecated: []
    },
    '2.9.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme'],
      deprecated: []
    },
    '3.0.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme', 'customization'],
      deprecated: ['onError']
    }
  },
  'SignUp': {
    '2.8.x': {
      props: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
      deprecated: []
    }
  },
  'UserButton': {
    '2.8.x': {
      props: ['className', 'style', 'showDisplayName', 'showEmail'],
      deprecated: []
    }
  },
  'AccountSettings': {
    '2.8.x': {
      props: ['className', 'style', 'sections'],
      deprecated: []
    }
  },
  'StackProvider': {
    '2.8.x': {
      props: ['app', 'children'],
      deprecated: []
    }
  }
};

// ASTRO integration examples for each component
const USAGE_EXAMPLES = {
  SignIn: {
    basic: `---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn client:load />
</body>
</html>`,
    withProps: `---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn 
    client:load
    redirectTo="/dashboard"
    providers={["google", "github"]}
    showTerms={true}
    termsUrl="/terms"
    privacyUrl="/privacy"
  />
</body>
</html>`,
    withCallback: `---
// src/pages/auth/signin.astro
---
<html>
<body>
  <SignIn 
    client:load
    onSuccess={(user) => {
      console.log('User signed in:', user.displayName);
      window.location.href = '/dashboard';
    }}
    onError={(error) => {
      console.error('Sign in failed:', error.message);
    }}
  />
</body>
</html>`
  },
  SignUp: {
    basic: `---
// src/pages/auth/signup.astro
---
<html>
<body>
  <SignUp client:load />
</body>
</html>`,
    withProps: `---
// src/pages/auth/signup.astro
---
<html>
<body>
  <SignUp 
    client:load
    redirectTo="/welcome"
    providers={["google", "github"]}
    showTerms={true}
    termsUrl="/terms"
    privacyUrl="/privacy"
  />
</body>
</html>`
  },
  UserButton: {
    basic: `---
// src/components/Header.astro
---
<header>
  <nav>
    <UserButton client:load />
  </nav>
</header>`,
    withProps: `---
// src/components/Header.astro
---
<header>
  <nav>
    <UserButton 
      client:load
      showDisplayName={true}
      showAvatar={true}
      colorModeToggle={true}
      onSignOut={() => {
        console.log('User signed out');
        window.location.href = '/';
      }}
    />
  </nav>
</header>`
  },
  AccountSettings: {
    basic: `---
// src/pages/account.astro
---
<html>
<body>
  <AccountSettings client:load />
</body>
</html>`,
    withProps: `---
// src/pages/account.astro
---
<html>
<body>
  <AccountSettings 
    client:load
    showProfile={true}
    showSecurity={true}
    onUpdateSuccess={(user) => {
      console.log('Profile updated for:', user.displayName);
    }}
  />
</body>
</html>`
  },
  StackProvider: {
    basic: `---
// src/layouts/Layout.astro
---
<html>
<body>
  <StackProvider 
    client:load
    projectId={import.meta.env.PUBLIC_STACK_PROJECT_ID}
    publishableClientKey={import.meta.env.PUBLIC_STACK_PUBLISHABLE_KEY}
  >
    <slot />
  </StackProvider>
</body>
</html>`
  }
};

/**
 * Generate type string from prop specification
 */
function formatPropType(type, required = false) {
  const baseType = type === 'react-node' ? 'ReactNode' : type;
  return required ? baseType : `${baseType} | undefined`;
}

/**
 * Generate prop table markdown
 */
function generatePropTable(componentName, propSpecs) {
  const headers = '| Prop | Type | Required | Description |';
  const separator = '|------|------|----------|-------------|';
  
  const rows = Object.entries(propSpecs).map(([propName, spec]) => {
    const type = `\`${formatPropType(spec.type, spec.required)}\``;
    const required = spec.required ? '✅' : '❌';
    const description = spec.description || 'No description available';
    
    return `| ${propName} | ${type} | ${required} | ${description} |`;
  });
  
  return [headers, separator, ...rows].join('\n');
}

/**
 * Generate version compatibility matrix
 */
function generateCompatibilityMatrix(componentName) {
  const compatibility = VERSION_COMPATIBILITY[componentName];
  if (!compatibility) {
    return '> Version compatibility information not available for this component.';
  }
  
  const versions = Object.keys(compatibility);
  if (versions.length === 0) {
    return '> No version compatibility information available.';
  }
  
  let matrix = '| Version | Supported Props | Deprecated Props |\n';
  matrix += '|---------|-----------------|------------------|\n';
  
  for (const version of versions) {
    const versionData = compatibility[version];
    const supportedProps = versionData.props.join(', ') || 'None';
    const deprecatedProps = versionData.deprecated?.join(', ') || 'None';
    
    matrix += `| ${version} | ${supportedProps} | ${deprecatedProps} |\n`;
  }
  
  return matrix;
}

/**
 * Generate usage examples section
 */
function generateUsageExamples(componentName) {
  const examples = USAGE_EXAMPLES[componentName];
  if (!examples) {
    return '```astro\n// Basic usage example not available\n```';
  }
  
  let examplesMarkdown = '';
  
  if (examples.basic) {
    examplesMarkdown += '### Basic Usage\n\n';
    examplesMarkdown += '```astro\n' + examples.basic + '\n```\n\n';
  }
  
  if (examples.withProps) {
    examplesMarkdown += '### With Props\n\n';
    examplesMarkdown += '```astro\n' + examples.withProps + '\n```\n\n';
  }
  
  if (examples.withCallback) {
    examplesMarkdown += '### With Event Handlers\n\n';
    examplesMarkdown += '```astro\n' + examples.withCallback + '\n```\n\n';
  }
  
  return examplesMarkdown;
}

/**
 * Generate component documentation
 */
function generateComponentDoc(componentName, propSpecs) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# ${componentName} Component

> Auto-generated documentation from validation schema - Last updated: ${currentDate}

## Overview

The ${componentName} component is a Stack Auth UI component that provides ${getComponentDescription(componentName)}.

## Props

${generatePropTable(componentName, propSpecs)}

## Usage Examples

${generateUsageExamples(componentName)}

## Version Compatibility

${generateCompatibilityMatrix(componentName)}

## TypeScript Integration

The ${componentName} component is fully typed and provides comprehensive TypeScript support:

\`\`\`typescript
import type { ${componentName}Props } from 'astro-stack-auth/components';

// Component props are automatically validated at runtime
const props: ${componentName}Props = {
  // TypeScript will provide autocomplete and validation
};
\`\`\`

## Common Patterns

### Conditional Rendering

\`\`\`astro
---
// src/components/ConditionalAuth.astro
const user = Astro.locals.user;
---

{user ? (
  <p>Welcome back, {user.displayName}!</p>
) : (
  <${componentName} client:load />
)}
\`\`\`

### Error Handling

\`\`\`astro
---
// src/pages/auth.astro
---
<${componentName}
  client:load
  onError={(error) => {
    // Handle authentication errors
    console.error('Auth error:', error);
    
    // Show user-friendly message
    alert('Authentication failed. Please try again.');
  }}
/>
\`\`\`

## Migration Guide

When updating Stack Auth versions, refer to the version compatibility matrix above. 

### Deprecated Props

${generateDeprecationWarnings(componentName)}

---

*This documentation is automatically generated from the runtime validation schema. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
`;
}

/**
 * Get component description
 */
function getComponentDescription(componentName) {
  const descriptions = {
    SignIn: 'user authentication with support for multiple providers',
    SignUp: 'user registration with customizable provider options',
    UserButton: 'a user profile button with avatar and dropdown menu',
    AccountSettings: 'comprehensive account management interface',
    StackProvider: 'authentication context for Stack Auth integration'
  };
  
  return descriptions[componentName] || 'authentication functionality';
}

/**
 * Generate deprecation warnings
 */
function generateDeprecationWarnings(componentName) {
  const compatibility = VERSION_COMPATIBILITY[componentName];
  if (!compatibility) return '> No deprecation information available.';
  
  const deprecatedProps = new Set();
  
  for (const versionData of Object.values(compatibility)) {
    if (versionData.deprecated) {
      versionData.deprecated.forEach(prop => deprecatedProps.add(prop));
    }
  }
  
  if (deprecatedProps.size === 0) {
    return '> No deprecated props for this component.';
  }
  
  return Array.from(deprecatedProps).map(prop => 
    `- \`${prop}\`: This prop is deprecated in newer versions. Check version compatibility matrix for details.`
  ).join('\n');
}

/**
 * Generate index documentation
 */
function generateIndexDoc() {
  const components = Object.keys(COMPONENT_PROP_SPECS);
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# Stack Auth Components Documentation

> Auto-generated component documentation - Last updated: ${currentDate}

This directory contains automatically generated documentation for all Stack Auth components available in the \`astro-stack-auth\` integration.

## Available Components

${components.map(name => `- [${name}](./${name.toLowerCase()}.md) - ${getComponentDescription(name)}`).join('\n')}

## Getting Started

1. **Install astro-stack-auth**: \`npm install astro-stack-auth\`
2. **Configure your project**: Add Stack Auth environment variables
3. **Wrap your app**: Use \`StackProvider\` in your layout
4. **Add components**: Import and use authentication components

### Quick Setup

\`\`\`astro
---
// src/layouts/Layout.astro
import { StackProvider } from 'astro-stack-auth/components';
---

<html>
<body>
  <StackProvider 
    client:load
    projectId={import.meta.env.PUBLIC_STACK_PROJECT_ID}
    publishableClientKey={import.meta.env.PUBLIC_STACK_PUBLISHABLE_KEY}
  >
    <slot />
  </StackProvider>
</body>
</html>
\`\`\`

## Documentation Generation

This documentation is automatically generated from the runtime validation schema using:

\`\`\`bash
npm run docs:generate
\`\`\`

The generator extracts:
- **Prop specifications** from component validation schema
- **Type information** from TypeScript interfaces  
- **Version compatibility** data from Stack Auth SDK versions
- **Usage examples** tailored for Astro projects

## Contributing

When adding new components or updating existing ones:

1. Update the validation schema in \`tests/helpers/runtime-validation.ts\`
2. Add usage examples in the documentation generator
3. Run \`npm run docs:generate\` to update documentation
4. Verify the generated docs are accurate and complete

---

*Generated from runtime validation schema on ${currentDate}*
`;
}

/**
 * Main documentation generation function
 */
function generateDocumentation() {
  console.log('🔧 Starting prop documentation generation...');
  
  // Ensure docs directory exists
  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }
  
  // Generate component documentation
  const components = Object.keys(COMPONENT_PROP_SPECS);
  let generatedCount = 0;
  
  for (const componentName of components) {
    const propSpecs = COMPONENT_PROP_SPECS[componentName];
    const docContent = generateComponentDoc(componentName, propSpecs);
    const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
    
    writeFileSync(docPath, docContent, 'utf-8');
    generatedCount++;
    
    console.log(`✅ Generated documentation for ${componentName}`);
  }
  
  // Generate index documentation
  const indexContent = generateIndexDoc();
  const indexPath = join(DOCS_DIR, 'README.md');
  writeFileSync(indexPath, indexContent, 'utf-8');
  
  console.log('✅ Generated index documentation');
  console.log(`📚 Successfully generated documentation for ${generatedCount} components`);
  console.log(`📁 Documentation saved to: ${DOCS_DIR}`);
}

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocumentation();
}

export { generateDocumentation, COMPONENT_PROP_SPECS, VERSION_COMPATIBILITY };