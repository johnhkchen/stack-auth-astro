#!/usr/bin/env node

/**
 * Component Interface Change Detection and Validation System
 * 
 * Detects breaking changes in component interfaces when Stack Auth SDK updates occur,
 * providing developers with clear migration guidance and preventing runtime errors.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractComponentProps, getSDKVersion } from './type-extractor.js';
import { detectSDKVersions, getVersionCompatibility } from './sdk-version-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const CHANGE_CACHE_DIR = join(ROOT_DIR, '.astro-stack-auth');
const INTERFACE_CACHE_FILE = join(CHANGE_CACHE_DIR, 'interface-cache.json');

/**
 * Change severity levels
 */
const CHANGE_SEVERITY = {
  BREAKING: 'breaking',
  NON_BREAKING: 'non-breaking', 
  ADDITION: 'addition',
  UNKNOWN: 'unknown'
};

/**
 * Change types for classification
 */
const CHANGE_TYPES = {
  PROP_REMOVED: 'prop_removed',
  PROP_ADDED: 'prop_added',
  PROP_TYPE_CHANGED: 'prop_type_changed',
  PROP_REQUIRED_CHANGED: 'prop_required_changed',
  PROP_DESCRIPTION_CHANGED: 'prop_description_changed'
};

/**
 * Load cached interface specifications from previous extraction
 */
function loadCachedInterfaces() {
  try {
    if (!existsSync(INTERFACE_CACHE_FILE)) {
      console.log('ℹ️ No cached interface data found, this is a fresh installation');
      return null;
    }
    
    const cacheData = JSON.parse(readFileSync(INTERFACE_CACHE_FILE, 'utf-8'));
    console.log(`📁 Loaded cached interfaces from ${cacheData.timestamp}`);
    console.log(`   SDK Version: ${cacheData.sdkVersion}`);
    console.log(`   Components: ${Object.keys(cacheData.interfaces).length}`);
    
    return cacheData;
  } catch (error) {
    console.warn(`⚠️ Error loading cached interfaces: ${error.message}`);
    return null;
  }
}

/**
 * Save current interface specifications to cache
 */
function saveCachedInterfaces(interfaces, sdkVersion) {
  try {
    if (!existsSync(CHANGE_CACHE_DIR)) {
      mkdirSync(CHANGE_CACHE_DIR, { recursive: true });
    }
    
    const cacheData = {
      timestamp: new Date().toISOString(),
      sdkVersion: sdkVersion || 'unknown',
      interfaces,
      generatedBy: 'astro-stack-auth-interface-change-detector'
    };
    
    writeFileSync(INTERFACE_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
    console.log(`💾 Cached interface data for future comparison`);
    console.log(`   Location: ${INTERFACE_CACHE_FILE}`);
    
  } catch (error) {
    console.warn(`⚠️ Could not save interface cache: ${error.message}`);
  }
}

/**
 * Compare two prop specifications to detect changes
 */
function comparePropSpecifications(oldProp, newProp, propName) {
  const changes = [];
  
  if (!oldProp && newProp) {
    // Prop was added
    changes.push({
      type: CHANGE_TYPES.PROP_ADDED,
      severity: CHANGE_SEVERITY.ADDITION,
      propName,
      description: `New prop '${propName}' added`,
      oldValue: null,
      newValue: newProp,
      migration: newProp.required 
        ? `Add required prop '${propName}' of type '${newProp.type}' to all ${propName} components`
        : `Optional prop '${propName}' of type '${newProp.type}' is now available`
    });
  } else if (oldProp && !newProp) {
    // Prop was removed
    changes.push({
      type: CHANGE_TYPES.PROP_REMOVED,
      severity: CHANGE_SEVERITY.BREAKING,
      propName,
      description: `Prop '${propName}' was removed`,
      oldValue: oldProp,
      newValue: null,
      migration: `Remove prop '${propName}' from all components, functionality may have been moved elsewhere`
    });
  } else if (oldProp && newProp) {
    // Prop exists in both, check for changes
    
    // Type changed
    if (oldProp.type !== newProp.type) {
      const severity = isTypeChangeBreaking(oldProp.type, newProp.type) 
        ? CHANGE_SEVERITY.BREAKING 
        : CHANGE_SEVERITY.NON_BREAKING;
        
      changes.push({
        type: CHANGE_TYPES.PROP_TYPE_CHANGED,
        severity,
        propName,
        description: `Prop '${propName}' type changed from '${oldProp.type}' to '${newProp.type}'`,
        oldValue: oldProp.type,
        newValue: newProp.type,
        migration: generateTypeMigration(propName, oldProp.type, newProp.type)
      });
    }
    
    // Required status changed
    if (oldProp.required !== newProp.required) {
      const severity = !oldProp.required && newProp.required 
        ? CHANGE_SEVERITY.BREAKING  // Optional -> Required = Breaking
        : CHANGE_SEVERITY.NON_BREAKING; // Required -> Optional = Non-breaking
        
      changes.push({
        type: CHANGE_TYPES.PROP_REQUIRED_CHANGED,
        severity,
        propName,
        description: `Prop '${propName}' changed from ${oldProp.required ? 'required' : 'optional'} to ${newProp.required ? 'required' : 'optional'}`,
        oldValue: oldProp.required,
        newValue: newProp.required,
        migration: newProp.required 
          ? `Prop '${propName}' is now required, ensure all components provide this prop`
          : `Prop '${propName}' is now optional, you can remove it if not needed`
      });
    }
    
    // Description changed (informational only)
    if (oldProp.description !== newProp.description) {
      changes.push({
        type: CHANGE_TYPES.PROP_DESCRIPTION_CHANGED,
        severity: CHANGE_SEVERITY.NON_BREAKING,
        propName,
        description: `Prop '${propName}' description updated`,
        oldValue: oldProp.description,
        newValue: newProp.description,
        migration: 'No migration required, description change only'
      });
    }
  }
  
  return changes;
}

/**
 * Determine if a type change is breaking
 */
function isTypeChangeBreaking(oldType, newType) {
  // Define type compatibility matrix
  const compatibleChanges = [
    // Non-breaking type changes
    ['string', 'string | undefined'], // Adding undefined to union (making optional)
    ['number', 'number | undefined'],
    ['boolean', 'boolean | undefined'],
    ['object', 'React.CSSProperties'], // More specific object type
    ['function', '() => void'], // More specific function signature
    ['any', 'string'], // any to more specific type
    ['any', 'number'],
    ['any', 'boolean'],
    ['any', 'object'],
    ['any', 'function']
  ];
  
  // Check if this is a known compatible change
  const isCompatible = compatibleChanges.some(([from, to]) => 
    oldType === from && newType === to
  );
  
  if (isCompatible) {
    return false;
  }
  
  // Check for union type additions (generally non-breaking)
  if (newType.includes('|') && newType.includes(oldType)) {
    return false; // Old type is included in new union
  }
  
  // Most other type changes are considered breaking
  return oldType !== newType;
}

/**
 * Generate specific migration guidance for type changes
 */
function generateTypeMigration(propName, oldType, newType) {
  // Special cases for common type changes
  if (oldType === 'string' && newType === 'string | undefined') {
    return `Prop '${propName}' now accepts undefined. Existing code should work without changes.`;
  }
  
  if (oldType === 'object' && newType === 'React.CSSProperties') {
    return `Prop '${propName}' now expects React.CSSProperties. Ensure CSS objects are properly typed.`;
  }
  
  if (oldType === 'function' && newType.includes('=>')) {
    return `Prop '${propName}' function signature changed. Update callback to match: ${newType}`;
  }
  
  if (newType.includes('|')) {
    return `Prop '${propName}' now accepts multiple types: ${newType}. Review usage to ensure compatibility.`;
  }
  
  // Generic migration advice
  return `Update prop '${propName}' to use type '${newType}' instead of '${oldType}'. Review all component usages.`;
}

/**
 * Compare interface specifications between two versions
 */
function compareInterfaces(oldInterfaces, newInterfaces) {
  const changes = {
    summary: {
      totalChanges: 0,
      breakingChanges: 0,
      nonBreakingChanges: 0,
      additions: 0,
      componentsAffected: 0
    },
    componentChanges: {}
  };
  
  // Get all component names from both old and new interfaces
  const allComponents = new Set([
    ...Object.keys(oldInterfaces || {}),
    ...Object.keys(newInterfaces || {})
  ]);
  
  for (const componentName of allComponents) {
    const oldComponent = oldInterfaces?.[componentName] || {};
    const newComponent = newInterfaces?.[componentName] || {};
    
    const componentChanges = [];
    
    // Get all prop names from both old and new
    const allProps = new Set([
      ...Object.keys(oldComponent),
      ...Object.keys(newComponent)
    ]);
    
    for (const propName of allProps) {
      const propChanges = comparePropSpecifications(
        oldComponent[propName],
        newComponent[propName],
        propName
      );
      
      componentChanges.push(...propChanges);
    }
    
    if (componentChanges.length > 0) {
      changes.componentChanges[componentName] = componentChanges;
      changes.summary.componentsAffected++;
      
      // Update summary counts
      for (const change of componentChanges) {
        changes.summary.totalChanges++;
        
        if (change.severity === CHANGE_SEVERITY.BREAKING) {
          changes.summary.breakingChanges++;
        } else if (change.severity === CHANGE_SEVERITY.NON_BREAKING) {
          changes.summary.nonBreakingChanges++;
        } else if (change.severity === CHANGE_SEVERITY.ADDITION) {
          changes.summary.additions++;
        }
      }
    }
  }
  
  return changes;
}

/**
 * Generate migration warnings for breaking changes
 */
function generateMigrationWarnings(changes) {
  const warnings = [];
  
  if (changes.summary.breakingChanges === 0) {
    return warnings;
  }
  
  warnings.push({
    level: 'error',
    message: `⚠️ ${changes.summary.breakingChanges} breaking changes detected!`,
    details: 'Review all breaking changes before upgrading to prevent runtime errors'
  });
  
  for (const [componentName, componentChanges] of Object.entries(changes.componentChanges)) {
    const breakingChanges = componentChanges.filter(c => c.severity === CHANGE_SEVERITY.BREAKING);
    
    if (breakingChanges.length > 0) {
      warnings.push({
        level: 'warning',
        message: `Component '${componentName}' has ${breakingChanges.length} breaking changes`,
        details: breakingChanges.map(c => `- ${c.description}: ${c.migration}`).join('\n')
      });
    }
  }
  
  return warnings;
}

/**
 * Generate automated migration suggestions
 */
function generateMigrationSuggestions(changes) {
  const suggestions = [];
  
  for (const [componentName, componentChanges] of Object.entries(changes.componentChanges)) {
    for (const change of componentChanges) {
      if (change.severity === CHANGE_SEVERITY.BREAKING) {
        suggestions.push({
          component: componentName,
          change: change.type,
          severity: change.severity,
          description: change.description,
          migration: change.migration,
          automated: canAutomate(change),
          codeExample: generateCodeExample(componentName, change)
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Check if a migration can be automated
 */
function canAutomate(change) {
  const automatableChanges = [
    CHANGE_TYPES.PROP_REMOVED,
    CHANGE_TYPES.PROP_ADDED,
    CHANGE_TYPES.PROP_REQUIRED_CHANGED
  ];
  
  return automatableChanges.includes(change.type);
}

/**
 * Generate code examples for migration
 */
function generateCodeExample(componentName, change) {
  const examples = {
    before: null,
    after: null
  };
  
  switch (change.type) {
    case CHANGE_TYPES.PROP_REMOVED:
      examples.before = `<${componentName} ${change.propName}={value} />`;
      examples.after = `<${componentName} />`;
      break;
      
    case CHANGE_TYPES.PROP_ADDED:
      if (change.newValue?.required) {
        examples.before = `<${componentName} />`;
        examples.after = `<${componentName} ${change.propName}={/* provide value */} />`;
      }
      break;
      
    case CHANGE_TYPES.PROP_TYPE_CHANGED:
      examples.before = `<${componentName} ${change.propName}={oldValue} />`;
      examples.after = `<${componentName} ${change.propName}={newValue} />`;
      break;
      
    case CHANGE_TYPES.PROP_REQUIRED_CHANGED:
      if (change.newValue) { // became required
        examples.before = `<${componentName} />`;
        examples.after = `<${componentName} ${change.propName}={value} />`;
      }
      break;
  }
  
  return examples;
}

/**
 * Detect interface changes between SDK versions
 */
async function detectInterfaceChanges() {
  console.log('🔍 Starting interface change detection...');
  
  try {
    // Step 1: Load cached interface data from previous version
    const cachedData = loadCachedInterfaces();
    
    // Step 2: Extract current interface specifications
    console.log('🔧 Extracting current interface specifications...');
    const currentInterfaces = await extractComponentProps();
    const sdkVersion = getSDKVersion();
    
    if (!currentInterfaces) {
      console.warn('⚠️ Could not extract current interfaces, change detection unavailable');
      return {
        success: false,
        reason: 'Interface extraction failed',
        changes: null
      };
    }
    
    console.log(`✅ Extracted interfaces for ${Object.keys(currentInterfaces).length} components`);
    
    // Step 3: Compare interfaces if we have cached data
    let changes = null;
    if (cachedData?.interfaces) {
      console.log('🔄 Comparing interfaces with previous version...');
      
      changes = compareInterfaces(cachedData.interfaces, currentInterfaces);
      
      console.log(`📊 Change Detection Results:`);
      console.log(`   Total Changes: ${changes.summary.totalChanges}`);
      console.log(`   Breaking Changes: ${changes.summary.breakingChanges}`);
      console.log(`   Non-Breaking Changes: ${changes.summary.nonBreakingChanges}`);
      console.log(`   Additions: ${changes.summary.additions}`);
      console.log(`   Components Affected: ${changes.summary.componentsAffected}`);
      
      // Generate warnings and suggestions
      changes.warnings = generateMigrationWarnings(changes);
      changes.suggestions = generateMigrationSuggestions(changes);
      
      if (changes.summary.breakingChanges > 0) {
        console.log('⚠️ BREAKING CHANGES DETECTED - Review migration guidance');
      } else if (changes.summary.totalChanges > 0) {
        console.log('ℹ️ Non-breaking changes detected - Update when convenient');
      } else {
        console.log('✅ No interface changes detected');
      }
      
    } else {
      console.log('ℹ️ No previous interfaces to compare against, establishing baseline');
    }
    
    // Step 4: Save current interfaces for future comparison
    saveCachedInterfaces(currentInterfaces, sdkVersion?.version);
    
    return {
      success: true,
      currentVersion: sdkVersion?.version || 'unknown',
      previousVersion: cachedData?.sdkVersion || null,
      changes,
      currentInterfaces,
      previousInterfaces: cachedData?.interfaces || null
    };
    
  } catch (error) {
    console.error(`❌ Interface change detection failed: ${error.message}`);
    return {
      success: false,
      reason: error.message,
      changes: null
    };
  }
}

/**
 * Generate change report for documentation integration
 */
function generateChangeReport(detectionResult) {
  if (!detectionResult.success || !detectionResult.changes) {
    return null;
  }
  
  const { changes, currentVersion, previousVersion } = detectionResult;
  
  const report = {
    timestamp: new Date().toISOString(),
    versionComparison: {
      previous: previousVersion,
      current: currentVersion
    },
    summary: changes.summary,
    breakingChanges: [],
    nonBreakingChanges: [],
    additions: [],
    migrationGuide: {
      warnings: changes.warnings || [],
      suggestions: changes.suggestions || [],
      automatedMigrations: (changes.suggestions || []).filter(s => s.automated)
    }
  };
  
  // Categorize changes by severity
  for (const [componentName, componentChanges] of Object.entries(changes.componentChanges)) {
    for (const change of componentChanges) {
      const changeEntry = {
        component: componentName,
        ...change
      };
      
      if (change.severity === CHANGE_SEVERITY.BREAKING) {
        report.breakingChanges.push(changeEntry);
      } else if (change.severity === CHANGE_SEVERITY.NON_BREAKING) {
        report.nonBreakingChanges.push(changeEntry);
      } else if (change.severity === CHANGE_SEVERITY.ADDITION) {
        report.additions.push(changeEntry);
      }
    }
  }
  
  return report;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running interface change detection...');
  
  detectInterfaceChanges()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Interface change detection completed');
        
        if (result.changes) {
          const report = generateChangeReport(result);
          if (report) {
            console.log('\n📋 Change Report Generated');
            console.log(`   Breaking Changes: ${report.breakingChanges.length}`);
            console.log(`   Non-Breaking Changes: ${report.nonBreakingChanges.length}`);
            console.log(`   Additions: ${report.additions.length}`);
            
            if (report.migrationGuide.warnings.length > 0) {
              console.log('\n⚠️ Migration Warnings:');
              for (const warning of report.migrationGuide.warnings) {
                console.log(`   ${warning.message}`);
              }
            }
          }
        }
      } else {
        console.log(`\n❌ Interface change detection failed: ${result.reason}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export {
  detectInterfaceChanges,
  compareInterfaces,
  generateChangeReport,
  generateMigrationWarnings,
  generateMigrationSuggestions,
  CHANGE_SEVERITY,
  CHANGE_TYPES
};