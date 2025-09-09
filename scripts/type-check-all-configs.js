#!/usr/bin/env node

/**
 * Type Check All Configurations Script
 * 
 * This script runs TypeScript type checking against all test configurations
 * to ensure React type integration works across different compiler settings.
 * 
 * Sprint: 001
 * Task: 1.2.4 - React Type Integration Testing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const configs = [
  'tsconfig.json',
  'test-configs/tsconfig.strict.json',
  'test-configs/tsconfig.loose.json',
  'test-configs/tsconfig.node16.json',
  'test-configs/tsconfig.classic.json'
];

const testFiles = [
  'src/react-integration-tests.ts',
  'src/typescript-config-validation.ts',
  'src/module-resolution-tests.ts',
  'src/react-component-integration.ts',
  'src/version-compatibility-tests.ts'
];

async function runTypeCheck(configPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Type checking with ${configPath}...`);
    
    const tsc = spawn('npx', ['tsc', '--noEmit', '--project', configPath], {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    tsc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    tsc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${configPath}: Type check passed`);
        resolve({ config: configPath, success: true, stdout, stderr });
      } else {
        console.log(`❌ ${configPath}: Type check failed (exit code ${code})`);
        console.log('STDERR:', stderr);
        console.log('STDOUT:', stdout);
        resolve({ config: configPath, success: false, stdout, stderr, exitCode: code });
      }
    });

    tsc.on('error', (error) => {
      console.log(`💥 ${configPath}: Error running type check`);
      console.error(error);
      reject({ config: configPath, error });
    });
  });
}

async function validateTestFiles() {
  console.log('\n📁 Validating test files exist...');
  
  const missingFiles = [];
  for (const file of testFiles) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(file);
    } else {
      console.log(`✅ ${file} exists`);
    }
  }

  if (missingFiles.length > 0) {
    console.log('\n❌ Missing test files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }

  return true;
}

async function validateConfigs() {
  console.log('\n⚙️  Validating TypeScript configurations...');
  
  const missingConfigs = [];
  for (const config of configs) {
    const fullPath = path.resolve(config);
    if (!fs.existsSync(fullPath)) {
      missingConfigs.push(config);
    } else {
      console.log(`✅ ${config} exists`);
    }
  }

  if (missingConfigs.length > 0) {
    console.log('\n❌ Missing config files:');
    missingConfigs.forEach(config => console.log(`   - ${config}`));
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 Starting React Type Integration Testing Pipeline');
  console.log('='.repeat(60));

  // Validate all files exist
  const filesValid = await validateTestFiles();
  const configsValid = await validateConfigs();

  if (!filesValid || !configsValid) {
    console.log('\n💥 Pre-flight validation failed. Exiting.');
    process.exit(1);
  }

  console.log('\n✅ All files and configurations found');

  // Run type checks for all configurations
  const results = [];
  
  for (const config of configs) {
    try {
      const result = await runTypeCheck(config);
      results.push(result);
    } catch (error) {
      results.push(error);
      console.error(`Failed to run type check for ${config}:`, error);
    }
  }

  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TYPE CHECK RESULTS SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n🔍 FAILED CONFIGURATIONS:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.config} (exit code: ${r.exitCode})`);
      });
  }

  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} ${result.config}`);
    
    if (!result.success && result.stderr) {
      // Show first few lines of error output
      const errorLines = result.stderr.split('\n').slice(0, 3);
      errorLines.forEach(line => {
        if (line.trim()) {
          console.log(`       ${line.trim()}`);
        }
      });
    }
  });

  // Additional build validation
  console.log('\n🔨 Running production build test...');
  try {
    const buildResult = await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        shell: true
      });

      let buildOutput = '';
      build.stdout.on('data', (data) => {
        buildOutput += data.toString();
      });

      build.stderr.on('data', (data) => {
        buildOutput += data.toString();
      });

      build.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Production build successful');
          resolve({ success: true, output: buildOutput });
        } else {
          console.log(`❌ Production build failed (exit code ${code})`);
          resolve({ success: false, output: buildOutput, exitCode: code });
        }
      });

      build.on('error', (error) => {
        reject(error);
      });
    });

    if (!buildResult.success) {
      console.log('Build output:', buildResult.output);
    }
  } catch (error) {
    console.log('💥 Error running build:', error);
  }

  // Final status
  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 ALL TYPE CHECKS PASSED! React type integration is working correctly.');
    process.exit(0);
  } else {
    console.log(`💥 ${failed} type check(s) failed. Please review the errors above.`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTypeCheck,
  validateTestFiles,
  validateConfigs,
  configs,
  testFiles
};