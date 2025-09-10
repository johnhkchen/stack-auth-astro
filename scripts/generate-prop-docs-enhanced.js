#!/usr/bin/env node

/**
 * Enhanced Automated Prop Documentation Generator
 * 
 * Extracts component prop specifications from @stackframe/stack-ui TypeScript types
 * dynamically at build time, with fallback to static validation schema.
 * Ensures perfect synchronization with the actual Stack Auth SDK.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractDynamicTypes, createExtractionResult } from './dynamic-type-extraction.js';
import { detectInterfaceChanges, generateChangeReport } from './interface-change-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DOCS_DIR = join(ROOT_DIR, 'docs', 'components');

// Static component specifications as fallback (imported from original generator)
const STATIC_COMPONENT_PROP_SPECS = {
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

// Static version compatibility as fallback
const STATIC_VERSION_COMPATIBILITY = {
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

// ASTRO integration examples (reused from original generator)
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
  // ... other components (truncated for brevity, would include all components)
};

/**
 * Generate type string from prop specification
 */
function formatPropType(type, required = false) {
  const baseType = type === 'react-node' ? 'ReactNode' : type;
  return required ? baseType : `${baseType} | undefined`;
}

/**
 * Generate enhanced prop table markdown with dynamic type indicators
 */
function generatePropTable(componentName, propSpecs) {
  const headers = '| Prop | Type | Required | Description | Source |';
  const separator = '|------|------|----------|-------------|--------|';
  
  const rows = Object.entries(propSpecs).map(([propName, spec]) => {
    const type = `\`${formatPropType(spec.type, spec.required)}\``;
    const required = spec.required ? '✅' : '❌';
    const description = spec.description || 'No description available';
    const source = spec.source === 'dynamic' ? '🔄 Dynamic' : '📝 Static';
    
    return `| ${propName} | ${type} | ${required} | ${description} | ${source} |`;
  });
  
  return [headers, separator, ...rows].join('\n');
}

/**
 * Generate enhanced version compatibility matrix
 */
function generateCompatibilityMatrix(componentName, versionCompatibility, extractionResult) {
  const compatibility = versionCompatibility[componentName];
  if (!compatibility) {
    return '> Version compatibility information not available for this component.';
  }
  
  const versions = Object.keys(compatibility);
  if (versions.length === 0) {
    return '> No version compatibility information available.';
  }
  
  let matrix = '| Version | Supported Props | Deprecated Props | Source |\n';
  matrix += '|---------|-----------------|------------------|--------|\n';
  
  for (const version of versions) {
    const versionData = compatibility[version];
    const supportedProps = versionData.props?.join(', ') || 'None';
    const deprecatedProps = versionData.deprecated?.join(', ') || 'None';
    const source = versionData.source === 'dynamic' ? '🔄 Dynamic' : '📝 Static';
    
    matrix += `| ${version} | ${supportedProps} | ${deprecatedProps} | ${source} |\n`;
  }
  
  // Add SDK version info if available
  if (extractionResult.dynamicExtractionSucceeded) {
    matrix += '\n';
    matrix += `> 📊 **Current SDK Version**: ${extractionResult.sdkVersionDetected}\n`;
    matrix += `> 🕒 **Last Updated**: ${new Date(extractionResult.timestamp).toLocaleString()}\n`;
  }
  
  return matrix;
}

/**
 * Generate change detection banner
 */
function generateChangeDetectionBanner(extractionResult) {
  if (!extractionResult.changeDetection?.enabled) {
    return '';
  }
  
  const { report } = extractionResult.changeDetection;
  
  if (!report) {
    return `> 🔍 **Interface Change Detection**: Enabled (baseline established)  
> 📊 **Status**: No previous version to compare against  
> 🕒 **Timestamp**: ${new Date().toISOString()}

*Interface change detection is now active and will detect changes on future updates.*`;
  }
  
  const { summary } = report;
  
  if (summary.totalChanges === 0) {
    return `> ✅ **Interface Change Detection**: No changes detected  
> 📊 **Version**: ${report.versionComparison.previous} → ${report.versionComparison.current}  
> 🕒 **Last Checked**: ${new Date(report.timestamp).toLocaleString()}

*No interface changes detected since last update.*`;
  }
  
  const breakingIcon = summary.breakingChanges > 0 ? '⚠️' : '✅';
  const statusText = summary.breakingChanges > 0 ? 'Breaking changes detected!' : 'Non-breaking changes detected';
  
  return `> ${breakingIcon} **Interface Change Detection**: ${statusText}  
> 📊 **Version**: ${report.versionComparison.previous} → ${report.versionComparison.current}  
> 🔢 **Changes**: ${summary.breakingChanges} breaking, ${summary.nonBreakingChanges} non-breaking, ${summary.additions} additions  
> 🕒 **Detected**: ${new Date(report.timestamp).toLocaleString()}

${summary.breakingChanges > 0 ? '*⚠️ Review migration guidance below before upgrading.*' : '*Safe to upgrade - no breaking changes detected.*'}`;
}

/**
 * Generate component-specific change information
 */
function generateComponentChangeInfo(componentName, extractionResult) {
  if (!extractionResult.changeDetection?.enabled || !extractionResult.changeDetection?.report) {
    return '';
  }
  
  const { report } = extractionResult.changeDetection;
  const componentChanges = report.breakingChanges.filter(c => c.component === componentName)
    .concat(report.nonBreakingChanges.filter(c => c.component === componentName))
    .concat(report.additions.filter(c => c.component === componentName));
  
  if (componentChanges.length === 0) {
    return '';
  }
  
  let changeSection = '\n## Recent Changes\n\n';
  changeSection += `> 📅 **Version ${report.versionComparison.previous} → ${report.versionComparison.current}**\n\n`;
  
  const breakingChanges = componentChanges.filter(c => c.severity === 'breaking');
  const nonBreakingChanges = componentChanges.filter(c => c.severity === 'non-breaking'); 
  const additions = componentChanges.filter(c => c.severity === 'addition');
  
  if (breakingChanges.length > 0) {
    changeSection += '### ⚠️ Breaking Changes\n\n';
    for (const change of breakingChanges) {
      changeSection += `- **${change.propName}**: ${change.description}\n`;
      changeSection += `  - **Migration**: ${change.migration}\n`;
      if (change.codeExample?.before && change.codeExample?.after) {
        changeSection += `  - **Before**: \`${change.codeExample.before}\`\n`;
        changeSection += `  - **After**: \`${change.codeExample.after}\`\n`;
      }
      changeSection += '\n';
    }
  }
  
  if (nonBreakingChanges.length > 0) {
    changeSection += '### ℹ️ Non-Breaking Changes\n\n';
    for (const change of nonBreakingChanges) {
      changeSection += `- **${change.propName}**: ${change.description}\n`;
      if (change.migration !== 'No migration required, description change only') {
        changeSection += `  - **Migration**: ${change.migration}\n`;
      }
      changeSection += '\n';
    }
  }
  
  if (additions.length > 0) {
    changeSection += '### ✨ New Features\n\n';
    for (const change of additions) {
      changeSection += `- **${change.propName}**: ${change.description}\n`;
      changeSection += `  - **Usage**: ${change.migration}\n`;
      changeSection += '\n';
    }
  }
  
  return changeSection;
}

/**
 * Generate extraction status banner
 */
function generateExtractionStatusBanner(extractionResult) {
  if (extractionResult.dynamicExtractionSucceeded) {
    return `> 🔄 **Dynamic Type Extraction**: ✅ Active  
> 📊 **SDK Version**: ${extractionResult.sdkVersionDetected}  
> 🕒 **Last Updated**: ${new Date(extractionResult.timestamp).toLocaleString()}  
> 📈 **Components**: ${extractionResult.componentCount} components with live type data

*This documentation is automatically synchronized with your installed Stack Auth SDK version.*`;
  } else {
    return `> 📝 **Static Type Specification**: Active  
> ⚠️ **Dynamic Extraction**: Failed - ${extractionResult.fallbackReason}  
> 🕒 **Last Attempted**: ${new Date(extractionResult.timestamp).toLocaleString()}

*Using static type specifications. Install @stackframe/stack-ui for automatic synchronization.*`;
  }
}

/**
 * Generate enhanced component documentation
 */
function generateComponentDoc(componentName, propSpecs, extractionResult) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# ${componentName} Component

${generateExtractionStatusBanner(extractionResult)}

${generateChangeDetectionBanner(extractionResult)}

## Overview

The ${componentName} component is a Stack Auth UI component that provides ${getComponentDescription(componentName)}.

${generateComponentChangeInfo(componentName, extractionResult)}

## Props

${generatePropTable(componentName, propSpecs)}

## Usage Examples

${generateUsageExamples(componentName)}

## Version Compatibility

${generateCompatibilityMatrix(componentName, extractionResult.versionCompatibility, extractionResult)}

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

${generateDeprecationWarnings(componentName, extractionResult.versionCompatibility)}

${generateRecommendations(extractionResult)}

---

*This documentation is ${extractionResult.dynamicExtractionSucceeded ? 'automatically generated from your installed Stack Auth SDK types' : 'generated from static type specifications'}. For the latest Stack Auth features, refer to the [Stack Auth Documentation](https://docs.stack-auth.com/).*
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
 * Generate deprecation warnings
 */
function generateDeprecationWarnings(componentName, versionCompatibility) {
  const compatibility = versionCompatibility[componentName];
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
 * Generate user recommendations based on extraction results
 */
function generateRecommendations(extractionResult) {
  if (!extractionResult.recommendations || extractionResult.recommendations.length === 0) {
    return '';
  }
  
  let section = '\n## Recommendations\n\n';
  
  for (const rec of extractionResult.recommendations) {
    const icon = rec.type === 'success' ? '✅' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
    section += `${icon} **${rec.message}**  \n${rec.action}\n\n`;
  }
  
  return section;
}

/**
 * Generate enhanced index documentation
 */
function generateIndexDoc(extractionResult) {
  const components = Object.keys(extractionResult.componentSpecs);
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# Stack Auth Components Documentation

${generateExtractionStatusBanner(extractionResult)}

${generateChangeDetectionBanner(extractionResult)}

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

This documentation is ${extractionResult.dynamicExtractionSucceeded ? 'dynamically generated from your installed @stackframe/stack-ui types' : 'generated from static type specifications'} using:

\`\`\`bash
npm run docs:generate
\`\`\`

The generator extracts:
- **Prop specifications** from ${extractionResult.dynamicExtractionSucceeded ? 'live SDK TypeScript types' : 'static validation schema'}
- **Type information** from ${extractionResult.dynamicExtractionSucceeded ? 'installed SDK version' : 'predefined TypeScript interfaces'}
- **Version compatibility** data from Stack Auth SDK versions
- **Usage examples** tailored for Astro projects

${generateRecommendations(extractionResult)}

## Contributing

When adding new components or updating existing ones:

1. ${extractionResult.dynamicExtractionSucceeded ? 'Install/update @stackframe/stack-ui to get latest types' : 'Update the validation schema in the documentation generator'}
2. Add usage examples in the documentation generator
3. Run \`npm run docs:generate\` to update documentation
4. Verify the generated docs are accurate and complete

---

*Generated ${extractionResult.dynamicExtractionSucceeded ? `from @stackframe/stack-ui@${extractionResult.sdkVersionDetected}` : 'from static specifications'} on ${currentDate}*
`;
}

/**
 * Main enhanced documentation generation function
 */
async function generateDocumentation() {
  console.log('🔧 Starting enhanced prop documentation generation...');
  
  // Step 1: Detect interface changes
  console.log('🔍 Detecting interface changes...');
  const changeDetectionResult = await detectInterfaceChanges();
  
  // Step 2: Attempt dynamic type extraction
  const dynamicExtractionResult = await extractDynamicTypes();
  
  // Step 3: Create comprehensive extraction result with change detection
  const extractionResult = createExtractionResult(
    dynamicExtractionResult,
    STATIC_COMPONENT_PROP_SPECS,
    STATIC_VERSION_COMPATIBILITY
  );
  
  // Step 4: Integrate change detection results
  if (changeDetectionResult.success) {
    const changeReport = generateChangeReport(changeDetectionResult);
    extractionResult.changeDetection = {
      enabled: true,
      result: changeDetectionResult,
      report: changeReport
    };
    
    if (changeReport && changeReport.summary.breakingChanges > 0) {
      console.log(`⚠️ ${changeReport.summary.breakingChanges} breaking changes detected!`);
    }
  } else {
    extractionResult.changeDetection = {
      enabled: false,
      reason: changeDetectionResult.reason
    };
  }
  
  console.log(`📊 Using ${extractionResult.dynamicExtractionSucceeded ? 'dynamic' : 'static'} type specifications`);
  console.log(`📈 Generating docs for ${extractionResult.componentCount} components`);
  
  // Step 5: Ensure docs directory exists
  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }
  
  // Step 6: Generate component documentation
  const components = Object.keys(extractionResult.componentSpecs);
  let generatedCount = 0;
  
  for (const componentName of components) {
    const propSpecs = extractionResult.componentSpecs[componentName];
    const docContent = generateComponentDoc(componentName, propSpecs, extractionResult);
    const docPath = join(DOCS_DIR, `${componentName.toLowerCase()}.md`);
    
    writeFileSync(docPath, docContent, 'utf-8');
    generatedCount++;
    
    const dynamicProps = Object.values(propSpecs).filter(spec => spec.source === 'dynamic').length;
    console.log(`✅ Generated documentation for ${componentName} (${dynamicProps} dynamic props)`);
  }
  
  // Step 7: Generate enhanced index documentation
  const indexContent = generateIndexDoc(extractionResult);
  const indexPath = join(DOCS_DIR, 'README.md');
  writeFileSync(indexPath, indexContent, 'utf-8');
  
  console.log('✅ Generated enhanced index documentation');
  console.log(`📚 Successfully generated documentation for ${generatedCount} components`);
  console.log(`📁 Documentation saved to: ${DOCS_DIR}`);
  
  // Step 8: Display extraction summary
  if (extractionResult.dynamicExtractionSucceeded) {
    console.log(`🎉 Dynamic type extraction succeeded!`);
    console.log(`   📊 SDK Version: ${extractionResult.sdkVersionDetected}`);
    console.log(`   🔄 Live synchronization with Stack Auth types`);
  } else {
    console.log(`⚠️ Dynamic type extraction failed: ${extractionResult.fallbackReason}`);
    console.log(`   📝 Using static type specifications as fallback`);
  }
  
  return extractionResult;
}

// Run the enhanced generator
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocumentation().catch(error => {
    console.error('❌ Documentation generation failed:', error);
    process.exit(1);
  });
}

export { generateDocumentation, STATIC_COMPONENT_PROP_SPECS, STATIC_VERSION_COMPATIBILITY };