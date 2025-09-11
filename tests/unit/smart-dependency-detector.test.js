import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SmartDependencyDetector } from '../../scripts/smart-dependency-detector.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SmartDependencyDetector', () => {
  let testDir;
  let detector;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `test-smart-detector-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('React detection', () => {
    it('should detect React imports in source files', async () => {
      // Create a file with React import
      writeFileSync(
        join(testDir, 'src', 'component.jsx'),
        `import React from 'react';\nexport default function Component() { return <div>Hello</div>; }`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(true);
      expect(report.detectedDependencies.react.confidence).toBe('certain');
      expect(report.detectedDependencies.react.reasons).toContain(
        expect.stringContaining('React import found')
      );
    });

    it('should detect JSX files as needing React', async () => {
      // Create a JSX file without explicit React import
      writeFileSync(
        join(testDir, 'src', 'app.jsx'),
        `export default function App() { return <h1>App</h1>; }`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.confidence).toBe('likely');
      expect(report.detectedDependencies.react.reasons).toContain(
        expect.stringContaining('Found JSX/TSX file')
      );
    });

    it('should detect Stack UI component usage', async () => {
      // Create a file using Stack UI components
      writeFileSync(
        join(testDir, 'src', 'auth.astro'),
        `---
import { SignIn } from 'astro-stack-auth/components';
---
<SignIn client:load />`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(true);
      expect(report.detectedDependencies.react.reasons).toContain(
        expect.stringContaining('Stack UI components used')
      );
    });

    it('should not require React for server-only usage', async () => {
      // Create a file with server-only Stack Auth usage
      writeFileSync(
        join(testDir, 'src', 'api.js'),
        `import { getUser } from 'astro-stack-auth/server';
export async function handler(context) {
  const user = await getUser(context);
  return new Response(JSON.stringify(user));
}`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(false);
      expect(report.detectedDependencies.react.confidence).toBe('unlikely');
    });
  });

  describe('TypeScript React detection', () => {
    it('should detect TSX files as needing @types/react', async () => {
      // Create a TSX file
      writeFileSync(
        join(testDir, 'src', 'component.tsx'),
        `interface Props { name: string; }
export default function Component({ name }: Props) {
  return <div>Hello {name}</div>;
}`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies['@types/react'].confidence).toBe('likely');
      expect(report.detectedDependencies['@types/react'].reasons).toContain(
        expect.stringContaining('TSX files found')
      );
    });

    it('should detect TypeScript JSX configuration', async () => {
      // Create tsconfig.json with JSX settings
      writeFileSync(
        join(testDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            jsx: 'react',
            strict: true
          }
        })
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.confidence).toBe('likely');
      expect(report.detectedDependencies.react.reasons).toContain(
        expect.stringContaining("TypeScript JSX compilation requires React")
      );
    });
  });

  describe('Configuration detection', () => {
    it('should detect @astrojs/react integration', async () => {
      // Create package.json with @astrojs/react
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@astrojs/react': '^3.0.0',
            'react': '^18.0.0'
          }
        })
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(true);
      expect(report.detectedDependencies.react.reasons).toContain(
        '@astrojs/react integration is installed'
      );
    });

    it('should respect explicit configuration', async () => {
      // Create .stackauthrc with explicit React disable
      writeFileSync(
        join(testDir, '.stackauthrc'),
        JSON.stringify({
          useReact: false
        })
      );

      // Create a JSX file that would normally trigger React requirement
      writeFileSync(
        join(testDir, 'src', 'component.jsx'),
        `export default function Component() { return <div>Hello</div>; }`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(false);
      expect(report.detectedDependencies.react.confidence).toBe('unlikely');
      expect(report.detectedDependencies.react.reasons).toContain(
        'React usage disabled in .stackauthrc'
      );
    });

    it('should detect Astro client directives', async () => {
      // Create an Astro file with client directives
      writeFileSync(
        join(testDir, 'src', 'page.astro'),
        `---
import { UserButton } from 'astro-stack-auth/components';
---
<UserButton client:visible />`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.confidence).toBe('likely');
      expect(report.detectedDependencies.react.reasons).toContain(
        expect.stringContaining('Client-side components found')
      );
    });
  });

  describe('Alternative framework detection', () => {
    it('should not recommend React when other frameworks are used', async () => {
      // Create package.json with Vue
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@astrojs/vue': '^3.0.0',
            'vue': '^3.0.0'
          }
        })
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.detectedDependencies.react.required).toBe(false);
      expect(report.detectedDependencies.react.suggestions).toContain(
        expect.stringContaining('Consider using Stack Auth without React')
      );
    });
  });

  describe('Report generation', () => {
    it('should generate actionable recommendations', async () => {
      // Create a project that needs React
      writeFileSync(
        join(testDir, 'src', 'app.jsx'),
        `import { SignIn } from 'astro-stack-auth/components';
export default function App() {
  return <SignIn />;
}`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.summary.reactNeeded).toBe(true);
      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'high',
          action: 'Install React dependencies',
          command: 'npm install react react-dom @astrojs/react'
        })
      );
    });

    it('should indicate when no React is needed', async () => {
      // Create a server-only project
      writeFileSync(
        join(testDir, 'src', 'server.js'),
        `console.log('Server only code');`
      );

      detector = new SmartDependencyDetector(testDir);
      const report = await detector.detect();

      expect(report.summary.reactNeeded).toBe(false);
      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'info',
          action: 'No React dependencies needed'
        })
      );
    });
  });
});