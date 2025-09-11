/**
 * Build Performance Integration Tests
 * 
 * Tests the build performance monitoring system integration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { readFile, access } from 'fs/promises';
import path from 'path';

describe('Build Performance Monitoring Integration', () => {
  const projectRoot = path.join(__dirname, '..', '..');

  const runScript = (script: string, args: string[] = []): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', script, ...args], {
        cwd: projectRoot,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  };

  const fileExists = async (filePath: string): Promise<boolean> => {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  describe('Build Cache Analyzer', () => {
    it('should analyze build cache successfully', async () => {
      const result = await runScript('build:cache:analyze');
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Build Cache Analysis Report');
      expect(result.stdout).toContain('Overall cache effectiveness');
      expect(result.stdout).toContain('Cache breakdown');
    });

    it('should provide cache optimization recommendations', async () => {
      const result = await runScript('build:cache:analyze');
      
      expect(result.stdout).toContain('Cache Optimization Recommendations');
    });

    it('should output valid cache metrics', async () => {
      const result = await runScript('build:cache:analyze');
      
      // Should contain percentage metrics
      expect(result.stdout).toMatch(/\d+%/);
      
      // Should contain size information
      expect(result.stdout).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
    });
  });

  describe('Build Performance Monitor', () => {
    it('should run development build monitoring', async () => {
      // This is a lightweight test - full build would take too long
      const result = await runScript('build:perf:dev');
      
      // Should at least start the monitoring process
      expect(result.stdout).toContain('Starting monitored build');
    }, 30000); // 30 second timeout

    it('should handle cache analysis integration', async () => {
      const result = await runScript('build:cache:analyze');
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('node_modules');
    });
  });

  describe('Performance Baseline Integration', () => {
    it('should integrate with existing baseline manager', async () => {
      // Test that the baseline manager files are accessible
      const baselineManagerPath = path.join(projectRoot, 'tests', 'utils', 'performance-baseline-manager.ts');
      const exists = await fileExists(baselineManagerPath);
      
      expect(exists).toBe(true);
    });

    it('should create performance directories', async () => {
      await runScript('build:cache:analyze');
      
      // Check that performance directory structure exists
      const perfDir = path.join(projectRoot, '.performance');
      const perfDirExists = await fileExists(perfDir);
      
      expect(perfDirExists).toBe(true);
    });
  });

  describe('CI Integration', () => {
    it('should handle CI build performance analysis', async () => {
      // Test the CI script with minimal options
      const result = await runScript('build:ci:perf:json');
      
      // Should output JSON even if build isn't fully successful
      expect(result.stdout).toContain('JSON Performance Report');
    }, 45000); // 45 second timeout
  });

  describe('Package.json Scripts', () => {
    const requiredScripts = [
      'build:cache:analyze',
      'build:cache:analyze:verbose',
      'build:cache:warm',
      'build:perf',
      'build:perf:dev',
      'build:perf:ci',
      'build:perf:baseline',
      'build:deps:analyze',
      'build:monitored',
      'build:monitored:dev',
      'build:ci:perf',
      'build:ci:perf:json',
      'build:ci:perf:strict'
    ];

    it('should have all required build performance scripts', async () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);

      for (const script of requiredScripts) {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(typeof packageJson.scripts[script]).toBe('string');
        expect(packageJson.scripts[script].length).toBeGreaterThan(0);
      }
    });
  });

  describe('Script Files', () => {
    const requiredFiles = [
      'scripts/build-performance-monitor.js',
      'scripts/build-cache-analyzer.js',
      'scripts/dependency-resolution-tracker.js',
      'scripts/ci-build-performance.js'
    ];

    it('should have all required script files', async () => {
      for (const file of requiredFiles) {
        const filePath = path.join(projectRoot, file);
        const exists = await fileExists(filePath);
        
        expect(exists).toBe(true);
      }
    });

    it('should have executable script files', async () => {
      for (const file of requiredFiles) {
        const filePath = path.join(projectRoot, file);
        const content = await readFile(filePath, 'utf8');
        
        // Should have shebang
        expect(content).toMatch(/^#!/);
        
        // Should have imports/requires
        expect(content).toMatch(/import|require/);
        
        // Should have class definitions or function exports
        expect(content).toMatch(/class|export/);
      }
    });
  });

  describe('Performance Monitoring Features', () => {
    it('should track build timing metrics', async () => {
      const result = await runScript('build:cache:analyze');
      
      // Should complete in reasonable time and provide timing info
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+(\.\d+)?\s*(ms|s|m)/); // Time format
    });

    it('should provide cache effectiveness metrics', async () => {
      const result = await runScript('build:cache:analyze');
      
      expect(result.stdout).toContain('cache effectiveness');
      expect(result.stdout).toMatch(/\d+%/); // Percentage format
    });

    it('should generate optimization recommendations', async () => {
      const result = await runScript('build:cache:analyze');
      
      expect(result.stdout).toContain('Optimization Recommendations');
    });
  });
});