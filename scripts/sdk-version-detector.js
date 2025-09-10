#!/usr/bin/env node

/**
 * SDK Version Detection and Validation System
 * 
 * Detects installed @stackframe/stack-ui version and provides
 * version-specific type extraction and documentation generation support.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SDK version compatibility matrix
 * Maps SDK versions to their expected component structure and capabilities
 */
const VERSION_COMPATIBILITY_MATRIX = {
  '2.8.x': {
    supportsDynamicTypes: true,
    components: {
      SignIn: {
        expectedProps: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'],
        deprecatedProps: [],
        typeExtractionSupported: true
      },
      SignUp: {
        expectedProps: ['className', 'style', 'onSuccess', 'onError', 'redirectUri'], 
        deprecatedProps: [],
        typeExtractionSupported: true
      },
      UserButton: {
        expectedProps: ['className', 'style', 'showDisplayName', 'showEmail'],
        deprecatedProps: [],
        typeExtractionSupported: true
      },
      AccountSettings: {
        expectedProps: ['className', 'style', 'sections'],
        deprecatedProps: [],
        typeExtractionSupported: true
      },
      StackProvider: {
        expectedProps: ['app', 'children'],
        deprecatedProps: [],
        typeExtractionSupported: true
      }
    }
  },
  '2.9.x': {
    supportsDynamicTypes: true,
    components: {
      SignIn: {
        expectedProps: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme'],
        deprecatedProps: [],
        typeExtractionSupported: true
      },
      SignUp: {
        expectedProps: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme'],
        deprecatedProps: [],
        typeExtractionSupported: true
      }
    }
  },
  '3.0.x': {
    supportsDynamicTypes: true,
    components: {
      SignIn: {
        expectedProps: ['className', 'style', 'onSuccess', 'onError', 'redirectUri', 'theme', 'customization'],
        deprecatedProps: ['onError'],
        typeExtractionSupported: true
      }
    }
  }
};

/**
 * Detect installed Stack Auth SDK versions
 */
function detectSDKVersions() {
  console.log('🔍 Detecting Stack Auth SDK versions...');
  
  const packages = ['@stackframe/stack', '@stackframe/stack-ui'];
  const versions = {};
  
  for (const packageName of packages) {
    try {
      const packagePath = resolvePackagePath(packageName);
      if (packagePath) {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        versions[packageName] = {
          version: packageJson.version,
          path: packagePath,
          name: packageJson.name,
          description: packageJson.description || '',
          dependencies: packageJson.dependencies || {},
          peerDependencies: packageJson.peerDependencies || {}
        };
        console.log(`✅ Found ${packageName}@${packageJson.version}`);
      } else {
        console.warn(`⚠️ Package ${packageName} not found`);
        versions[packageName] = null;
      }
    } catch (error) {
      console.error(`❌ Error reading ${packageName}: ${error.message}`);
      versions[packageName] = null;
    }
  }
  
  return versions;
}

/**
 * Resolve package.json path for a given package
 */
function resolvePackagePath(packageName) {
  const possiblePaths = [
    join(process.cwd(), 'node_modules', packageName, 'package.json'),
    join(__dirname, '..', 'node_modules', packageName, 'package.json'),
    join(__dirname, '../..', 'node_modules', packageName, 'package.json')
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  // Try using npm ls as fallback
  try {
    const result = execSync(`npm list ${packageName} --json`, { 
      stdio: 'pipe', 
      cwd: process.cwd() 
    });
    const npmInfo = JSON.parse(result.toString());
    const packageInfo = findPackageInNpmList(npmInfo, packageName);
    if (packageInfo && packageInfo.path) {
      const packageJsonPath = join(packageInfo.path, 'package.json');
      if (existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
    }
  } catch (error) {
    // npm ls failed, continue with other methods
  }
  
  return null;
}

/**
 * Find package information in npm ls output
 */
function findPackageInNpmList(npmInfo, packageName) {
  if (npmInfo.dependencies && npmInfo.dependencies[packageName]) {
    return npmInfo.dependencies[packageName];
  }
  
  // Search recursively
  if (npmInfo.dependencies) {
    for (const [, depInfo] of Object.entries(npmInfo.dependencies)) {
      if (depInfo.dependencies) {
        const found = findPackageInNpmList(depInfo, packageName);
        if (found) return found;
      }
    }
  }
  
  return null;
}

/**
 * Get version compatibility information for detected SDK version
 */
function getVersionCompatibility(sdkVersions) {
  const stackUIVersion = sdkVersions['@stackframe/stack-ui'];
  
  if (!stackUIVersion) {
    console.warn('⚠️ @stackframe/stack-ui not detected, using fallback compatibility');
    return {
      version: 'unknown',
      supportsDynamicTypes: false,
      components: {},
      fallbackRequired: true
    };
  }
  
  const version = stackUIVersion.version;
  const majorMinor = extractMajorMinorVersion(version);
  
  // Find matching compatibility entry
  const compatibilityKey = Object.keys(VERSION_COMPATIBILITY_MATRIX).find(key => {
    if (key.endsWith('.x')) {
      const keyMajorMinor = key.replace('.x', '');
      return majorMinor.startsWith(keyMajorMinor);
    }
    return key === version;
  });
  
  if (compatibilityKey) {
    const compatibility = VERSION_COMPATIBILITY_MATRIX[compatibilityKey];
    console.log(`✅ Found compatibility info for ${compatibilityKey}`);
    return {
      version: majorMinor,
      detectedVersion: version,
      supportsDynamicTypes: compatibility.supportsDynamicTypes,
      components: compatibility.components,
      fallbackRequired: false
    };
  }
  
  console.warn(`⚠️ No compatibility info for version ${version}, using latest known`);
  
  // Use the latest version as fallback
  const latestKey = Object.keys(VERSION_COMPATIBILITY_MATRIX).pop();
  const latestCompatibility = VERSION_COMPATIBILITY_MATRIX[latestKey];
  
  return {
    version: majorMinor,
    detectedVersion: version,
    supportsDynamicTypes: latestCompatibility.supportsDynamicTypes,
    components: latestCompatibility.components,
    fallbackRequired: true,
    fallbackReason: `Version ${version} not in compatibility matrix`
  };
}

/**
 * Extract major.minor version from full version string
 */
function extractMajorMinorVersion(version) {
  const parts = version.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return version;
}

/**
 * Validate SDK installation and compatibility
 */
function validateSDKInstallation(sdkVersions, compatibility) {
  console.log('🔍 Validating SDK installation...');
  
  const issues = [];
  
  // Check that both packages are installed
  if (!sdkVersions['@stackframe/stack']) {
    issues.push('❌ @stackframe/stack is not installed');
  }
  
  if (!sdkVersions['@stackframe/stack-ui']) {
    issues.push('❌ @stackframe/stack-ui is not installed');
  }
  
  // Check version compatibility between packages
  if (sdkVersions['@stackframe/stack'] && sdkVersions['@stackframe/stack-ui']) {
    const stackVersion = sdkVersions['@stackframe/stack'].version;
    const stackUIVersion = sdkVersions['@stackframe/stack-ui'].version;
    
    const stackMajorMinor = extractMajorMinorVersion(stackVersion);
    const stackUIMajorMinor = extractMajorMinorVersion(stackUIVersion);
    
    if (stackMajorMinor !== stackUIMajorMinor) {
      issues.push(`⚠️ Version mismatch: @stackframe/stack@${stackVersion} vs @stackframe/stack-ui@${stackUIVersion}`);
    }
  }
  
  // Check if dynamic type extraction is supported
  if (!compatibility.supportsDynamicTypes) {
    issues.push('⚠️ Dynamic type extraction not supported for this SDK version');
  }
  
  if (issues.length > 0) {
    console.log('⚠️ SDK validation found issues:');
    for (const issue of issues) {
      console.log(`   ${issue}`);
    }
  } else {
    console.log('✅ SDK installation validated successfully');
  }
  
  return {
    valid: issues.filter(i => i.startsWith('❌')).length === 0,
    warnings: issues.filter(i => i.startsWith('⚠️')),
    errors: issues.filter(i => i.startsWith('❌'))
  };
}

/**
 * Check if type extraction should be attempted based on SDK version
 */
function shouldAttemptTypeExtraction(compatibility, validation) {
  if (!validation.valid) {
    console.log('❌ Skipping type extraction due to validation errors');
    return false;
  }
  
  if (!compatibility.supportsDynamicTypes) {
    console.log('ℹ️ Dynamic type extraction not supported for this SDK version');
    return false;
  }
  
  if (compatibility.fallbackRequired) {
    console.log(`⚠️ Using fallback compatibility: ${compatibility.fallbackReason}`);
    // Still attempt extraction but with lower confidence
    return true;
  }
  
  console.log('✅ Type extraction supported and recommended');
  return true;
}

/**
 * Generate SDK version report
 */
function generateVersionReport(sdkVersions, compatibility, validation) {
  const report = {
    timestamp: new Date().toISOString(),
    sdkVersions,
    compatibility,
    validation,
    recommendations: []
  };
  
  // Add recommendations based on findings
  if (!validation.valid) {
    report.recommendations.push('Install missing Stack Auth packages');
  }
  
  if (validation.warnings.length > 0) {
    report.recommendations.push('Review version compatibility warnings');
  }
  
  if (compatibility.fallbackRequired) {
    report.recommendations.push('Consider updating to a tested SDK version');
  }
  
  if (!compatibility.supportsDynamicTypes) {
    report.recommendations.push('Dynamic type extraction unavailable - using static fallback');
  }
  
  return report;
}

export {
  detectSDKVersions,
  getVersionCompatibility,
  validateSDKInstallation,
  shouldAttemptTypeExtraction,
  generateVersionReport,
  VERSION_COMPATIBILITY_MATRIX
};