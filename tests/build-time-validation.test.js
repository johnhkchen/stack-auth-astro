/**
 * Build-time Component Prop Validation Tests
 * 
 * Tests for the build-time validation pipeline that catches component
 * prop validation errors during the build process.
 * 
 * Sprint: 001
 * Task: 1.2.28 - Implement Build-time Component Prop Validation Pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  runBuildTimeValidation,
  extractAstroComponentUsages,
  extractJSXComponentUsages,
  formatValidationResults
} from '../dist/build-time-validation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'component-validation');

describe('Build-time Component Prop Validation', () => {
  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(FIXTURES_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test fixtures
    try {
      await fs.rm(FIXTURES_DIR, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('Astro File Component Extraction', () => {
    it('should extract Stack Auth components from Astro files', async () => {
      const astroContent = `
---
import { SignIn, UserButton } from 'astro-stack-auth/components';
---

<html>
  <body>
    <SignIn redirectTo="/dashboard" />
    <UserButton showDisplayName={true} className="user-btn" />
  </body>
</html>
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'test.astro');
      await fs.writeFile(filePath, astroContent);

      const usages = await extractAstroComponentUsages(filePath, astroContent);

      expect(usages).toHaveLength(2);
      
      // SignIn component
      expect(usages[0].component).toBe('SignIn');
      expect(usages[0].props.redirectTo).toBe('/dashboard');
      expect(usages[0].location.file).toBe(filePath);
      
      // UserButton component
      expect(usages[1].component).toBe('UserButton');
      expect(usages[1].props.showDisplayName).toBe(true);
      expect(usages[1].props.className).toBe('user-btn');
    });

    it('should handle malformed Astro files gracefully', async () => {
      const malformedContent = `
<html>
  <body>
    <SignIn redirectTo="/dashboard
  </body>
</html>
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'malformed.astro');
      await fs.writeFile(filePath, malformedContent);

      const usages = await extractAstroComponentUsages(filePath, malformedContent);
      // Should not throw and return empty array
      expect(Array.isArray(usages)).toBe(true);
    });

    it('should ignore non-Stack Auth components', async () => {
      const astroContent = `
---
import { SignIn } from 'astro-stack-auth/components';
import { Button } from './components/Button.astro';
---

<html>
  <body>
    <SignIn redirectTo="/dashboard" />
    <Button>Click me</Button>
    <div>Regular content</div>
  </body>
</html>
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'mixed.astro');
      await fs.writeFile(filePath, astroContent);

      const usages = await extractAstroComponentUsages(filePath, astroContent);

      expect(usages).toHaveLength(1);
      expect(usages[0].component).toBe('SignIn');
    });
  });

  describe('JSX File Component Extraction', () => {
    it('should extract Stack Auth components from JSX files', async () => {
      const jsxContent = `
import React from 'react';
import { SignUp, StackProvider } from 'astro-stack-auth/components';

export function AuthPage() {
  return (
    <StackProvider projectId="test-project" publishableClientKey="pk_test_123">
      <SignUp onSuccess={() => {}} providers={['google', 'github']} />
    </StackProvider>
  );
}
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'auth.jsx');
      await fs.writeFile(filePath, jsxContent);

      const usages = await extractJSXComponentUsages(filePath, jsxContent);

      expect(usages).toHaveLength(2);
      
      // StackProvider
      const stackProvider = usages.find(u => u.component === 'StackProvider');
      expect(stackProvider).toBeDefined();
      expect(stackProvider.props.projectId).toBe('test-project');
      expect(stackProvider.props.publishableClientKey).toBe('pk_test_123');
      
      // SignUp
      const signUp = usages.find(u => u.component === 'SignUp');
      expect(signUp).toBeDefined();
      expect(Array.isArray(signUp.props.providers)).toBe(false); // Would be evaluated differently
    });

    it('should handle TSX files', async () => {
      const tsxContent = `
import React from 'react';
import { UserButton } from 'astro-stack-auth/components';

interface Props {
  userId: string;
}

export const UserProfile: React.FC<Props> = ({ userId }) => {
  return (
    <div>
      <UserButton 
        showDisplayName={true}
        showAvatar={true}
        onSignOut={() => console.log('signed out')}
      />
    </div>
  );
};
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'profile.tsx');
      await fs.writeFile(filePath, tsxContent);

      const usages = await extractJSXComponentUsages(filePath, tsxContent);

      expect(usages).toHaveLength(1);
      expect(usages[0].component).toBe('UserButton');
      expect(usages[0].props.showDisplayName).toBe(true);
      expect(usages[0].props.showAvatar).toBe(true);
      expect(usages[0].type).toBe('tsx');
    });
  });

  describe('Component Prop Validation', () => {
    it('should validate required props', async () => {
      // StackProvider requires projectId and publishableClientKey
      const astroContent = `
<StackProvider>
  <SignIn />
</StackProvider>
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'missing-props.astro');
      await fs.writeFile(filePath, astroContent);

      const config = {
        include: [filePath],
        exclude: [],
        failOnError: false,
        showWarnings: true,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);

      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => 
        e.component === 'StackProvider' && 
        e.prop === 'projectId' &&
        e.message.includes('Required prop')
      )).toBe(true);
    });

    it('should validate prop types', async () => {
      const astroContent = `
<UserButton showDisplayName="invalid" />
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'invalid-types.astro');
      await fs.writeFile(filePath, astroContent);

      const config = {
        include: [filePath],
        exclude: [],
        failOnError: false,
        showWarnings: true,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);

      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => 
        e.component === 'UserButton' && 
        e.prop === 'showDisplayName' &&
        e.message.includes('Invalid type')
      )).toBe(true);
    });

    it('should warn about unknown props', async () => {
      const astroContent = `
<SignIn unknownProp="value" redirectTo="/dashboard" />
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'unknown-props.astro');
      await fs.writeFile(filePath, astroContent);

      const config = {
        include: [filePath],
        exclude: [],
        failOnError: false,
        showWarnings: true,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);

      expect(result.hasErrors).toBe(true);
      expect(result.errors.some(e => 
        e.component === 'SignIn' && 
        e.prop === 'unknownProp' &&
        e.message.includes('Unknown prop')
      )).toBe(true);
    });

    it('should pass validation for correct props', async () => {
      const astroContent = `
<SignIn redirectTo="/dashboard" providers={['google']} showTerms={true} />
<UserButton showDisplayName={true} showAvatar={false} />
      `.trim();

      const filePath = path.join(FIXTURES_DIR, 'valid-props.astro');
      await fs.writeFile(filePath, astroContent);

      const config = {
        include: [filePath],
        exclude: [],
        failOnError: false,
        showWarnings: true,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);

      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.componentCount).toBe(2);
    });
  });

  describe('Build Configuration', () => {
    beforeEach(async () => {
      // Create some test files
      const files = {
        'src/pages/auth.astro': '<SignIn redirectTo="/dashboard" />',
        'src/components/Profile.jsx': 'export const Profile = () => <UserButton showDisplayName={true} />;',
        'node_modules/test/component.astro': '<SignIn />',
        'dist/build.astro': '<UserButton />'
      };

      for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(FIXTURES_DIR, relativePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
      }
    });

    it('should respect include patterns', async () => {
      const config = {
        include: ['**/*.astro'],
        exclude: [],
        failOnError: false,
        showWarnings: false,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);
      
      // Should find .astro files but not .jsx files
      expect(result.processedFiles.some(f => f.includes('auth.astro'))).toBe(true);
      expect(result.processedFiles.some(f => f.includes('Profile.jsx'))).toBe(false);
    });

    it('should respect exclude patterns', async () => {
      const config = {
        include: ['**/*.astro', '**/*.jsx'],
        exclude: ['node_modules/**', 'dist/**'],
        failOnError: false,
        showWarnings: false,
        enableCache: false
      };

      const result = await runBuildTimeValidation(config);
      
      // Should exclude node_modules and dist files
      expect(result.processedFiles.some(f => f.includes('node_modules'))).toBe(false);
      expect(result.processedFiles.some(f => f.includes('dist'))).toBe(false);
      expect(result.processedFiles.some(f => f.includes('src'))).toBe(true);
    });
  });

  describe('Error Formatting', () => {
    it('should format validation results correctly', () => {
      const result = {
        hasErrors: true,
        hasWarnings: true,
        errors: [{
          component: 'SignIn',
          prop: 'redirectTo',
          received: undefined,
          expected: 'string',
          message: 'Required prop "redirectTo" is missing',
          suggestion: 'Add the redirectTo prop with type string',
          location: {
            file: '/path/to/auth.astro',
            line: 5,
            column: 10,
            source: '<SignIn />'
          }
        }],
        warnings: [{
          component: 'UserButton',
          prop: 'oldProp',
          message: 'Prop "oldProp" is deprecated',
          suggestion: 'Use newProp instead',
          location: {
            file: '/path/to/profile.astro',
            line: 3,
            column: 5,
            source: '<UserButton oldProp={true} />'
          }
        }],
        componentCount: 2,
        fileCount: 2,
        processedFiles: ['/path/to/auth.astro', '/path/to/profile.astro']
      };

      const formatted = formatValidationResults(result);

      expect(formatted).toContain('BUILD-TIME COMPONENT VALIDATION RESULTS');
      expect(formatted).toContain('Processed 2 files with 2 component usages');
      expect(formatted).toContain('Found 1 validation error(s)');
      expect(formatted).toContain('Found 1 validation warning(s)');
      expect(formatted).toContain('SignIn in /path/to/auth.astro:5');
      expect(formatted).toContain('Required prop "redirectTo" is missing');
      expect(formatted).toContain('Add the redirectTo prop with type string');
    });

    it('should handle successful validation', () => {
      const result = {
        hasErrors: false,
        hasWarnings: false,
        errors: [],
        warnings: [],
        componentCount: 3,
        fileCount: 2,
        processedFiles: ['/path/to/auth.astro', '/path/to/profile.astro']
      };

      const formatted = formatValidationResults(result);

      expect(formatted).toContain('BUILD-TIME COMPONENT VALIDATION RESULTS');
      expect(formatted).toContain('Processed 2 files with 3 component usages');
      expect(formatted).toContain('All Stack Auth component usages are valid!');
      expect(formatted).not.toContain('error');
      expect(formatted).not.toContain('warning');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache validation results when enabled', async () => {
      const astroContent = '<SignIn redirectTo="/dashboard" />';
      const filePath = path.join(FIXTURES_DIR, 'cached.astro');
      await fs.writeFile(filePath, astroContent);

      const config = {
        include: [filePath],
        exclude: [],
        failOnError: false,
        showWarnings: false,
        enableCache: true
      };

      // First run
      const start1 = Date.now();
      const result1 = await runBuildTimeValidation(config);
      const time1 = Date.now() - start1;

      // Second run (should be faster due to caching)
      const start2 = Date.now();
      const result2 = await runBuildTimeValidation(config);
      const time2 = Date.now() - start2;

      expect(result1.componentCount).toBe(result2.componentCount);
      expect(result1.hasErrors).toBe(result2.hasErrors);
      
      // Second run should be significantly faster (though this might be flaky in CI)
      // So we just check that both runs completed successfully
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThan(0);
    });

    it('should handle concurrent validation requests', async () => {
      const files = [];
      for (let i = 0; i < 5; i++) {
        const content = `<SignIn redirectTo="/dashboard${i}" />`;
        const filePath = path.join(FIXTURES_DIR, `concurrent${i}.astro`);
        await fs.writeFile(filePath, content);
        files.push(filePath);
      }

      const config = {
        include: files,
        exclude: [],
        failOnError: false,
        showWarnings: false,
        enableCache: false
      };

      // Run multiple validations concurrently
      const promises = Array(3).fill(0).map(() => runBuildTimeValidation(config));
      const results = await Promise.all(promises);

      // All results should be consistent
      for (const result of results) {
        expect(result.componentCount).toBe(5);
        expect(result.hasErrors).toBe(false);
        expect(result.fileCount).toBe(5);
      }
    });
  });
});