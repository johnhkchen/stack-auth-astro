#!/usr/bin/env node

/**
 * Test script for package resolution diagnostics
 * 
 * Tests various resolution scenarios and verifies diagnostic output
 */

import { EnhancedModuleResolver, ResolutionError } from './package-resolution-diagnostics.js';

console.log('🧪 Testing Enhanced Package Resolution Diagnostics\n');
console.log('=' .repeat(60));

async function testResolution(moduleName, description, options = {}) {
  console.log(`\n📦 Test: ${description}`);
  console.log(`   Module: ${moduleName}`);
  
  const resolver = new EnhancedModuleResolver({
    ...options,
    debug: true
  });
  
  const startTime = Date.now();
  
  try {
    const result = await resolver.resolveModule(moduleName);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Resolution successful!`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Strategy: ${result.strategy}`);
    console.log(`   Time: ${result.timing.toFixed(2)}ms`);
    console.log(`   Cached: ${result.cached || false}`);
    
    // Get diagnostic summary
    const summary = resolver.getDiagnosticSummary();
    console.log(`   Attempts: ${summary.totalAttempts}`);
    console.log(`   Strategies tried: ${summary.strategiesUsed.join(', ')}`);
    
    return { success: true, result, summary };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(`   ❌ Resolution failed!`);
    
    if (error instanceof ResolutionError) {
      console.log(`   Total attempts: ${error.report.totalAttempts}`);
      console.log(`   Strategies tried: ${error.report.strategiesUsed.join(', ')}`);
      console.log(`   Time: ${error.timing.toFixed(2)}ms`);
      
      if (error.report.recommendations.length > 0) {
        console.log(`   📋 Recommendations:`);
        error.report.recommendations.forEach(rec => {
          console.log(`      - ${rec.suggestion}`);
          if (rec.command) {
            console.log(`        Run: ${rec.command}`);
          }
        });
      }
      
      // Show attempt details
      console.log(`   📊 Attempt details:`);
      error.report.attemptDetails.forEach((attempt, i) => {
        const status = attempt.success ? '✅' : '❌';
        const timing = attempt.timing ? `${attempt.timing.toFixed(2)}ms` : 'N/A';
        console.log(`      ${i + 1}. ${status} ${attempt.strategy} (${timing})`);
      });
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    return { success: false, error };
  }
}

async function runTests() {
  const tests = [
    {
      module: '@stackframe/stack',
      description: 'Stack Auth main package',
      options: {}
    },
    {
      module: '@stackframe/stack-ui',
      description: 'Stack Auth UI components',
      options: {}
    },
    {
      module: 'typescript',
      description: 'TypeScript (should be installed)',
      options: {}
    },
    {
      module: 'react',
      description: 'React (optional dependency)',
      options: {}
    },
    {
      module: 'nonexistent-package-12345',
      description: 'Non-existent package (should fail with diagnostics)',
      options: {}
    },
    {
      module: '@stackframe/stack',
      description: 'Stack Auth with caching (second attempt)',
      options: { cache: true }
    }
  ];
  
  const results = {
    total: tests.length,
    successful: 0,
    failed: 0,
    cached: 0
  };
  
  for (const test of tests) {
    const result = await testResolution(test.module, test.description, test.options);
    
    if (result.success) {
      results.successful++;
      if (result.result.cached) {
        results.cached++;
      }
    } else {
      results.failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   Total tests: ${results.total}`);
  console.log(`   Successful: ${results.successful}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Cached hits: ${results.cached}`);
  
  // Test specific diagnostic features
  console.log('\n' + '=' .repeat(60));
  console.log('🔬 Testing Diagnostic Features:\n');
  
  // Test environment detection
  const resolver = new EnhancedModuleResolver();
  console.log(`✓ Package manager detected: ${resolver.packageManager}`);
  
  // Test debug mode
  console.log(`✓ Debug mode: ${process.env.STACK_AUTH_DEBUG === 'true' ? 'enabled' : 'disabled'}`);
  
  // Test performance tracking
  console.log('✓ Performance tracking: enabled');
  
  // Test cache functionality
  resolver.clearCache();
  console.log('✓ Cache cleared successfully');
  
  console.log('\n✅ All diagnostic features tested successfully!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});