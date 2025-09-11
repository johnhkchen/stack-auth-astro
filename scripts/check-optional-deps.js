#!/usr/bin/env node

/**
 * Check Optional Dependencies Script
 * 
 * Runs smart dependency detection and provides actionable feedback
 * about which optional dependencies are actually needed.
 */

import { SmartDependencyDetector } from './smart-dependency-detector.js';
import { EnhancedModuleResolver } from './package-resolution-diagnostics.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const projectPath = process.cwd();

/**
 * Check if a package is installed
 */
function isPackageInstalled(packageName) {
  try {
    require.resolve(packageName, { paths: [projectPath] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get installed package version
 */
function getPackageVersion(packageName) {
  try {
    const pkgPath = join(projectPath, 'node_modules', packageName, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version;
    }
  } catch {}
  return null;
}

/**
 * Main check function
 */
async function checkOptionalDependencies() {
  console.log(chalk.bold.blue('\n🔍 Checking Optional Dependencies for Stack Auth\n'));
  console.log(chalk.gray('=' .repeat(60)));
  
  // Run smart detection
  const detector = new SmartDependencyDetector(projectPath, {
    verbose: process.argv.includes('--verbose')
  });
  
  console.log(chalk.yellow('Analyzing your project...'));
  const report = await detector.detect();
  
  // Check current installation status
  const dependencies = [
    { name: 'react', required: false },
    { name: 'react-dom', required: false },
    { name: '@types/react', required: false },
    { name: '@types/react-dom', required: false },
    { name: '@astrojs/react', required: false }
  ];
  
  for (const dep of dependencies) {
    dep.installed = isPackageInstalled(dep.name);
    dep.version = getPackageVersion(dep.name);
    
    const detection = report.detectedDependencies[dep.name];
    if (detection) {
      dep.required = detection.required;
      dep.confidence = detection.confidence;
      dep.reasons = detection.reasons;
      dep.suggestions = detection.suggestions;
    }
  }
  
  // Display results
  console.log(chalk.gray('=' .repeat(60)));
  console.log(chalk.bold.white('\n📊 Dependency Status:\n'));
  
  const statusTable = [];
  for (const dep of dependencies) {
    const status = dep.installed 
      ? chalk.green('✓ Installed') 
      : chalk.gray('✗ Not installed');
    
    const needed = dep.required 
      ? chalk.yellow(`Required (${dep.confidence})`)
      : chalk.gray('Optional');
    
    const version = dep.version ? chalk.cyan(`v${dep.version}`) : '';
    
    console.log(`  ${chalk.white(dep.name.padEnd(20))} ${status.padEnd(25)} ${needed.padEnd(30)} ${version}`);
    
    if (!dep.installed && dep.required) {
      statusTable.push({
        name: dep.name,
        action: 'install',
        reasons: dep.reasons
      });
    } else if (dep.installed && !dep.required) {
      statusTable.push({
        name: dep.name,
        action: 'optional',
        note: 'Installed but not required based on usage'
      });
    }
  }
  
  // Show detailed findings
  if (report.summary.reactNeeded) {
    console.log(chalk.bold.yellow('\n⚠️  React Dependencies Needed:\n'));
    
    const reactInfo = report.detectedDependencies['react'];
    if (reactInfo && reactInfo.reasons.length > 0) {
      console.log(chalk.white('  Why React is needed:'));
      for (const reason of reactInfo.reasons.slice(0, 5)) {
        console.log(chalk.gray(`    • ${reason}`));
      }
    }
  } else {
    console.log(chalk.bold.green('\n✅ No React Dependencies Required:\n'));
    console.log(chalk.gray('  Your project does not use React features.'));
    console.log(chalk.gray('  Stack Auth will work with server-side authentication only.'));
  }
  
  // Show recommendations
  if (report.recommendations.length > 0) {
    console.log(chalk.bold.white('\n💡 Recommendations:\n'));
    
    for (const rec of report.recommendations) {
      const icon = rec.priority === 'high' ? '❗' : rec.priority === 'medium' ? '⚡' : 'ℹ️';
      console.log(`  ${icon} ${chalk.white(rec.action)}`);
      
      if (rec.command) {
        console.log(chalk.cyan(`     ${rec.command}`));
      }
      if (rec.reason) {
        console.log(chalk.gray(`     ${rec.reason}`));
      }
    }
  }
  
  // Test resolution for missing required dependencies
  if (statusTable.some(s => s.action === 'install')) {
    console.log(chalk.bold.yellow('\n🧪 Testing Package Resolution:\n'));
    
    const resolver = new EnhancedModuleResolver({
      debug: process.argv.includes('--verbose')
    });
    
    for (const item of statusTable.filter(s => s.action === 'install')) {
      try {
        console.log(chalk.gray(`  Testing resolution for ${item.name}...`));
        await resolver.resolveModule(item.name);
        console.log(chalk.green(`    ✓ ${item.name} can be resolved (might be available globally)`));
      } catch (error) {
        console.log(chalk.red(`    ✗ ${item.name} cannot be resolved`));
        if (error.smartDetection && !error.smartDetection.needed) {
          console.log(chalk.gray(`      But this is OK - it's not needed for your project`));
        }
      }
    }
  }
  
  // Configuration suggestions
  console.log(chalk.bold.white('\n⚙️  Configuration Options:\n'));
  console.log(chalk.gray('  You can explicitly control React usage by:'));
  console.log(chalk.gray('  1. Setting environment variable: STACK_AUTH_USE_REACT=true|false'));
  console.log(chalk.gray('  2. Creating .stackauthrc file (see .stackauthrc.example)'));
  console.log(chalk.gray('  3. Configuring in your Astro config'));
  
  console.log(chalk.gray('\n' + '=' .repeat(60)));
  
  // Exit code based on missing required dependencies
  const hasMissingRequired = statusTable.some(s => s.action === 'install');
  
  if (hasMissingRequired) {
    console.log(chalk.yellow('\n⚠️  Some required dependencies are missing.'));
    console.log(chalk.yellow('Run the recommended install commands above.\n'));
    return 1;
  } else {
    console.log(chalk.green('\n✅ All required dependencies are satisfied.\n'));
    return 0;
  }
}

// Run the check
checkOptionalDependencies()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error(chalk.red('\n❌ Error checking dependencies:'), error.message);
    if (process.argv.includes('--verbose')) {
      console.error(error.stack);
    }
    process.exit(1);
  });