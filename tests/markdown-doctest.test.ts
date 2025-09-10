import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Markdown Doctest Integration', () => {
  test('feature specifications pass', () => {
    try {
      const result = execSync('npm run docs:test', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      
      // Check that the command succeeded and contains success indicators
      expect(result).toContain('Success!');
      expect(result).not.toContain('Failed:');
    } catch (error: any) {
      // If the command fails, we still want to see the output for debugging
      console.error('Markdown doctest output:', error.stdout);
      throw new Error(`Markdown doctests failed: ${error.message}`);
    }
  });

  test('sprint specifications pass', () => {
    try {
      const result = execSync('npm run sprints:test', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      
      // Check that the command succeeded
      expect(result).toContain('Success!');
    } catch (error: any) {
      console.error('Sprint doctest output:', error.stdout);
      throw new Error(`Sprint doctests failed: ${error.message}`);
    }
  });

  test('all markdown tests pass together', () => {
    try {
      const result = execSync('npm run test:all', { 
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      
      // Should run both docs:test and sprints:test successfully
      expect(result).toContain('Success!');
      
      // Should show both test suites ran
      const successCount = (result.match(/Success!/g) || []).length;
      expect(successCount).toBeGreaterThanOrEqual(2);
    } catch (error: any) {
      console.error('All markdown doctest output:', error.stdout);
      throw new Error(`All markdown doctests failed: ${error.message}`);
    }
  });
});