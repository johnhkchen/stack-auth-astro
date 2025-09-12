/**
 * Global Teardown for Visual Regression Testing
 * 
 * Cleans up test environment and generates test reports.
 */

import { type FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after visual regression tests...');
  
  try {
    // Generate test summary
    await generateTestSummary();
    
    // Clean up temporary files
    await cleanupTempFiles();
    
    console.log('✅ Global teardown complete');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  try {
    const reportPath = 'playwright-report/test-results.json';
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
    
    if (reportExists) {
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const results = JSON.parse(reportData);
      
      const summary = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(
        'playwright-report/summary.json',
        JSON.stringify(summary, null, 2)
      );
      
      console.log(`📈 Test Summary: ${summary.passed}/${summary.totalTests} tests passed`);
    }
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('🗑️  Cleaning up temporary files...');
  
  try {
    const tempDirs = [
      'test-results/temp',
      '.playwright-cache'
    ];
    
    for (const dir of tempDirs) {
      try {
        await fs.access(dir);
        // Directory exists, but we'll leave cleanup to Playwright
        console.log(`✅ Temp directory ${dir} handled by Playwright`);
      } catch {
        // Directory doesn't exist, nothing to clean
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not clean up temp files:', error.message);
  }
}

export default globalTeardown;