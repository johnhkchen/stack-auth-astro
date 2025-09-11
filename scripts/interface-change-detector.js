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
const HISTORICAL_CACHE_FILE = join(CHANGE_CACHE_DIR, 'historical-cache.json');

/**
 * Maximum number of historical versions to retain
 */
const MAX_HISTORICAL_VERSIONS = 5;

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
 * Load historical interface data from all previous versions
 */
function loadHistoricalCache() {
  try {
    if (!existsSync(HISTORICAL_CACHE_FILE)) {
      console.log('ℹ️ No historical cache found, initializing new historical tracking');
      return {
        versions: [],
        analytics: {
          totalVersions: 0,
          firstVersion: null,
          lastUpdate: null,
          changeFrequency: {}
        }
      };
    }
    
    const historicalData = JSON.parse(readFileSync(HISTORICAL_CACHE_FILE, 'utf-8'));
    console.log(`📚 Loaded historical cache with ${historicalData.versions.length} versions`);
    
    return historicalData;
  } catch (error) {
    console.warn(`⚠️ Error loading historical cache: ${error.message}`);
    return {
      versions: [],
      analytics: {
        totalVersions: 0,
        firstVersion: null,
        lastUpdate: null,
        changeFrequency: {}
      }
    };
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
    
    const timestamp = new Date().toISOString();
    const cacheData = {
      timestamp,
      sdkVersion: sdkVersion || 'unknown',
      interfaces,
      generatedBy: 'astro-stack-auth-interface-change-detector'
    };
    
    // Save current cache
    writeFileSync(INTERFACE_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
    console.log(`💾 Cached interface data for future comparison`);
    console.log(`   Location: ${INTERFACE_CACHE_FILE}`);
    
    // Update historical cache
    updateHistoricalCache(cacheData);
    
  } catch (error) {
    console.warn(`⚠️ Could not save interface cache: ${error.message}`);
  }
}

/**
 * Update historical cache with new version data
 */
function updateHistoricalCache(newVersionData) {
  try {
    const historicalData = loadHistoricalCache();
    
    // Check if this version already exists to avoid duplicates
    const existingIndex = historicalData.versions.findIndex(
      v => v.sdkVersion === newVersionData.sdkVersion
    );
    
    if (existingIndex !== -1) {
      // Update existing version data
      historicalData.versions[existingIndex] = newVersionData;
      console.log(`📝 Updated existing version ${newVersionData.sdkVersion} in historical cache`);
    } else {
      // Add new version
      historicalData.versions.push(newVersionData);
      console.log(`📚 Added new version ${newVersionData.sdkVersion} to historical cache`);
    }
    
    // Sort versions by timestamp (newest first)
    historicalData.versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Keep only the last MAX_HISTORICAL_VERSIONS
    if (historicalData.versions.length > MAX_HISTORICAL_VERSIONS) {
      const removed = historicalData.versions.splice(MAX_HISTORICAL_VERSIONS);
      console.log(`🧹 Cleaned up ${removed.length} old versions from historical cache`);
    }
    
    // Update analytics
    historicalData.analytics = {
      totalVersions: historicalData.versions.length,
      firstVersion: historicalData.versions[historicalData.versions.length - 1]?.sdkVersion || null,
      lastUpdate: newVersionData.timestamp,
      changeFrequency: calculateChangeFrequency(historicalData.versions)
    };
    
    // Save historical cache
    writeFileSync(HISTORICAL_CACHE_FILE, JSON.stringify(historicalData, null, 2), 'utf-8');
    console.log(`📚 Updated historical cache with ${historicalData.versions.length} versions`);
    
  } catch (error) {
    console.warn(`⚠️ Could not update historical cache: ${error.message}`);
  }
}

/**
 * Calculate change frequency analytics from historical versions
 */
function calculateChangeFrequency(versions) {
  if (versions.length < 2) {
    return {
      averageTimeBetweenVersions: null,
      totalChanges: 0,
      changesByComponent: {}
    };
  }
  
  const changesByComponent = {};
  let totalChanges = 0;
  const timeBetweenVersions = [];
  
  // Analyze changes between consecutive versions
  for (let i = 0; i < versions.length - 1; i++) {
    const newer = versions[i];
    const older = versions[i + 1];
    
    // Calculate time between versions
    const timeDiff = new Date(newer.timestamp) - new Date(older.timestamp);
    timeBetweenVersions.push(timeDiff);
    
    // Compare interfaces to count changes
    const changes = compareInterfaces(older.interfaces, newer.interfaces);
    totalChanges += changes.summary.totalChanges;
    
    // Count changes by component
    for (const [componentName, componentChanges] of Object.entries(changes.componentChanges)) {
      if (!changesByComponent[componentName]) {
        changesByComponent[componentName] = 0;
      }
      changesByComponent[componentName] += componentChanges.length;
    }
  }
  
  const averageTime = timeBetweenVersions.length > 0 
    ? timeBetweenVersions.reduce((a, b) => a + b, 0) / timeBetweenVersions.length
    : null;
  
  return {
    averageTimeBetweenVersions: averageTime,
    totalChanges,
    changesByComponent,
    versionHistory: versions.length
  };
}

/**
 * Analyze version change patterns across historical data
 */
function analyzeVersionPatterns(historicalData) {
  if (!historicalData.versions || historicalData.versions.length < 2) {
    return {
      patterns: [],
      insights: ['Insufficient historical data for pattern analysis'],
      regressionRisk: 'unknown'
    };
  }
  
  const patterns = [];
  const insights = [];
  
  // Analyze version change frequency
  const avgTimeBetweenVersions = historicalData.analytics.averageTimeBetweenVersions;
  if (avgTimeBetweenVersions) {
    const days = Math.round(avgTimeBetweenVersions / (1000 * 60 * 60 * 24));
    patterns.push(`Average time between versions: ${days} days`);
    
    if (days < 7) {
      insights.push('High-frequency updates detected - consider implementing automated testing');
    } else if (days > 90) {
      insights.push('Low-frequency updates - changes may be more significant per release');
    }
  }
  
  // Analyze most frequently changing components
  const changesByComponent = historicalData.analytics.changeFrequency.changesByComponent;
  const sortedComponents = Object.entries(changesByComponent)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
    
  if (sortedComponents.length > 0) {
    patterns.push(`Most changed components: ${sortedComponents.map(([name, count]) => `${name} (${count})`).join(', ')}`);
    
    const highChangeComponents = sortedComponents.filter(([,count]) => count > 5);
    if (highChangeComponents.length > 0) {
      insights.push(`High-change components detected: ${highChangeComponents.map(([name]) => name).join(', ')} - monitor for stability`);
    }
  }
  
  // Determine regression risk based on pattern analysis
  let regressionRisk = 'low';
  if (avgTimeBetweenVersions && avgTimeBetweenVersions < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
    regressionRisk = 'medium';
  }
  if (sortedComponents.some(([,count]) => count > 10)) {
    regressionRisk = 'high';
  }
  
  return {
    patterns,
    insights,
    regressionRisk,
    recommendedTesting: regressionRisk === 'high' ? 'comprehensive' : regressionRisk === 'medium' ? 'targeted' : 'standard'
  };
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
 * Analyze version changes to detect potentially breaking changes
 */
function analyzeVersionChange(previousVersion, currentVersion) {
  if (!previousVersion || !currentVersion || previousVersion === 'unknown' || currentVersion === 'unknown') {
    return {
      potentiallyBreaking: false,
      changeType: 'unknown',
      description: 'Version information unavailable'
    };
  }
  
  if (previousVersion === currentVersion) {
    return {
      potentiallyBreaking: false,
      changeType: 'none',
      description: 'No version change detected'
    };
  }
  
  // Parse semantic versions
  const parsePrevious = parseVersion(previousVersion);
  const parseCurrent = parseVersion(currentVersion);
  
  if (!parsePrevious || !parseCurrent) {
    return {
      potentiallyBreaking: true,
      changeType: 'unparseable',
      description: `Version change detected but cannot parse versions: ${previousVersion} → ${currentVersion}`
    };
  }
  
  // Check for major version changes
  if (parseCurrent.major > parsePrevious.major) {
    return {
      potentiallyBreaking: true,
      changeType: 'major',
      description: `Major version upgrade detected: ${previousVersion} → ${currentVersion}`,
      severity: 'high'
    };
  }
  
  // Check for minor version changes  
  if (parseCurrent.minor > parsePrevious.minor) {
    return {
      potentiallyBreaking: false,
      changeType: 'minor',
      description: `Minor version upgrade detected: ${previousVersion} → ${currentVersion}`,
      severity: 'medium'
    };
  }
  
  // Check for patch version changes
  if (parseCurrent.patch > parsePrevious.patch) {
    return {
      potentiallyBreaking: false,
      changeType: 'patch',
      description: `Patch version upgrade detected: ${previousVersion} → ${currentVersion}`,
      severity: 'low'
    };
  }
  
  // Version downgrade detected
  return {
    potentiallyBreaking: true,
    changeType: 'downgrade',
    description: `Version downgrade detected: ${previousVersion} → ${currentVersion}`,
    severity: 'high'
  };
}

/**
 * Parse semantic version string
 */
function parseVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Generate multi-version migration path guidance
 */
function generateMultiVersionMigrationPath(fromVersion, toVersion, historicalData) {
  if (!fromVersion || !toVersion || !historicalData.versions) {
    return {
      path: [],
      totalSteps: 0,
      estimatedEffort: 'unknown',
      migrationSteps: []
    };
  }
  
  // Find version indices in historical data
  const versionMap = new Map(historicalData.versions.map((v, i) => [v.sdkVersion, i]));
  const fromIndex = versionMap.get(fromVersion);
  const toIndex = versionMap.get(toVersion);
  
  if (fromIndex === undefined || toIndex === undefined) {
    return {
      path: [],
      totalSteps: 0,
      estimatedEffort: 'unknown',
      migrationSteps: [],
      error: `Version not found in historical data: ${fromVersion} -> ${toVersion}`
    };
  }
  
  // Get all versions in the migration path (sorted by timestamp)
  const pathVersions = historicalData.versions.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
  if (fromIndex > toIndex) {
    pathVersions.reverse(); // Handle downgrades
  }
  
  const migrationSteps = [];
  let totalBreakingChanges = 0;
  
  // Analyze changes between each consecutive version pair
  for (let i = 0; i < pathVersions.length - 1; i++) {
    const current = pathVersions[i];
    const next = pathVersions[i + 1];
    
    const changes = compareInterfaces(current.interfaces, next.interfaces);
    const step = {
      from: current.sdkVersion,
      to: next.sdkVersion,
      timestamp: next.timestamp,
      changes: changes.summary,
      breakingChanges: changes.summary.breakingChanges,
      migrationActions: generateVersionSpecificMigration(changes)
    };
    
    migrationSteps.push(step);
    totalBreakingChanges += changes.summary.breakingChanges;
  }
  
  // Estimate migration effort
  let estimatedEffort = 'low';
  if (totalBreakingChanges > 10 || pathVersions.length > 3) {
    estimatedEffort = 'high';
  } else if (totalBreakingChanges > 3 || pathVersions.length > 2) {
    estimatedEffort = 'medium';
  }
  
  return {
    path: pathVersions.map(v => v.sdkVersion),
    totalSteps: migrationSteps.length,
    totalBreakingChanges,
    estimatedEffort,
    migrationSteps,
    recommendations: generateMigrationRecommendations(migrationSteps, estimatedEffort)
  };
}

/**
 * Generate specific migration actions for version changes
 */
function generateVersionSpecificMigration(changes) {
  const actions = [];
  
  for (const [componentName, componentChanges] of Object.entries(changes.componentChanges)) {
    for (const change of componentChanges) {
      if (change.severity === CHANGE_SEVERITY.BREAKING) {
        actions.push({
          component: componentName,
          action: change.migration,
          priority: 'high',
          type: change.type
        });
      } else if (change.severity === CHANGE_SEVERITY.NON_BREAKING) {
        actions.push({
          component: componentName,
          action: change.migration,
          priority: 'medium',
          type: change.type
        });
      }
    }
  }
  
  return actions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Generate migration recommendations based on complexity
 */
function generateMigrationRecommendations(migrationSteps, estimatedEffort) {
  const recommendations = [];
  
  if (estimatedEffort === 'high') {
    recommendations.push('Consider migrating incrementally through intermediate versions');
    recommendations.push('Create comprehensive backup before starting migration');
    recommendations.push('Run full test suite after each intermediate version');
  } else if (estimatedEffort === 'medium') {
    recommendations.push('Test thoroughly after each migration step');
    recommendations.push('Consider staging environment for testing');
  } else {
    recommendations.push('Migration should be straightforward');
    recommendations.push('Standard testing procedures should be sufficient');
  }
  
  // Identify components with frequent changes
  const componentFrequency = {};
  migrationSteps.forEach(step => {
    step.migrationActions.forEach(action => {
      componentFrequency[action.component] = (componentFrequency[action.component] || 0) + 1;
    });
  });
  
  const frequentComponents = Object.entries(componentFrequency)
    .filter(([, count]) => count > 2)
    .map(([component]) => component);
    
  if (frequentComponents.length > 0) {
    recommendations.push(`Pay special attention to frequently changed components: ${frequentComponents.join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Generate dynamic compatibility matrix based on historical data
 */
function generateCompatibilityMatrix(historicalData) {
  if (!historicalData.versions || historicalData.versions.length < 2) {
    return {
      matrix: {},
      summary: {
        totalVersions: historicalData.versions?.length || 0,
        compatiblePairs: 0,
        incompatiblePairs: 0
      },
      recommendations: ['Insufficient historical data for compatibility analysis']
    };
  }
  
  const versions = historicalData.versions.map(v => v.sdkVersion).reverse(); // Oldest to newest
  const matrix = {};
  let compatiblePairs = 0;
  let incompatiblePairs = 0;
  
  // Initialize matrix structure
  for (const fromVersion of versions) {
    matrix[fromVersion] = {};
    for (const toVersion of versions) {
      matrix[fromVersion][toVersion] = {
        compatible: true,
        breakingChanges: 0,
        migrationComplexity: 'low',
        notes: []
      };
    }
  }
  
  // Analyze compatibility between all version pairs
  for (let i = 0; i < versions.length; i++) {
    for (let j = 0; j < versions.length; j++) {
      if (i === j) {
        matrix[versions[i]][versions[j]] = {
          compatible: true,
          breakingChanges: 0,
          migrationComplexity: 'none',
          notes: ['Same version - no migration needed']
        };
        continue;
      }
      
      const fromVersion = versions[i];
      const toVersion = versions[j];
      
      // Generate migration path to analyze compatibility
      const migrationPath = generateMultiVersionMigrationPath(fromVersion, toVersion, historicalData);
      
      const isCompatible = migrationPath.totalBreakingChanges === 0;
      const complexity = migrationPath.estimatedEffort || 'unknown';
      
      matrix[fromVersion][toVersion] = {
        compatible: isCompatible,
        breakingChanges: migrationPath.totalBreakingChanges || 0,
        migrationComplexity: complexity,
        migrationSteps: migrationPath.totalSteps || 0,
        notes: generateCompatibilityNotes(migrationPath, fromVersion, toVersion)
      };
      
      if (isCompatible) {
        compatiblePairs++;
      } else {
        incompatiblePairs++;
      }
    }
  }
  
  return {
    matrix,
    summary: {
      totalVersions: versions.length,
      compatiblePairs,
      incompatiblePairs,
      compatibilityRate: Math.round((compatiblePairs / (compatiblePairs + incompatiblePairs)) * 100) || 0
    },
    recommendations: generateCompatibilityRecommendations(matrix, versions)
  };
}

/**
 * Generate compatibility notes for version pairs
 */
function generateCompatibilityNotes(migrationPath, fromVersion, toVersion) {
  const notes = [];
  
  if (migrationPath.error) {
    notes.push(migrationPath.error);
    return notes;
  }
  
  if (migrationPath.totalBreakingChanges === 0) {
    notes.push('Forward compatible - no breaking changes');
  } else {
    notes.push(`${migrationPath.totalBreakingChanges} breaking changes require migration`);
  }
  
  if (migrationPath.totalSteps > 1) {
    notes.push(`Multi-step migration through ${migrationPath.totalSteps} versions`);
  }
  
  if (migrationPath.estimatedEffort === 'high') {
    notes.push('Complex migration - consider professional support');
  }
  
  // Add specific component warnings
  const affectedComponents = new Set();
  migrationPath.migrationSteps?.forEach(step => {
    step.migrationActions?.forEach(action => {
      if (action.priority === 'high') {
        affectedComponents.add(action.component);
      }
    });
  });
  
  if (affectedComponents.size > 0) {
    notes.push(`Critical components affected: ${Array.from(affectedComponents).join(', ')}`);
  }
  
  return notes;
}

/**
 * Generate compatibility matrix recommendations
 */
function generateCompatibilityRecommendations(matrix, versions) {
  const recommendations = [];
  
  // Analyze overall compatibility trends
  let totalIncompatible = 0;
  let downgradePaths = 0;
  let complexMigrations = 0;
  
  for (const fromVersion of versions) {
    for (const toVersion of versions) {
      const compatibility = matrix[fromVersion][toVersion];
      
      if (!compatibility.compatible) {
        totalIncompatible++;
      }
      
      if (compatibility.migrationComplexity === 'high') {
        complexMigrations++;
      }
      
      // Check for downgrade compatibility
      const fromIndex = versions.indexOf(fromVersion);
      const toIndex = versions.indexOf(toVersion);
      if (fromIndex > toIndex && compatibility.compatible) {
        downgradePaths++;
      }
    }
  }
  
  if (totalIncompatible > versions.length) {
    recommendations.push('High incompatibility detected - consider more gradual version updates');
  }
  
  if (complexMigrations > 0) {
    recommendations.push(`${complexMigrations} complex migrations identified - budget extra time for these upgrades`);
  }
  
  if (downgradePaths > 0) {
    recommendations.push(`${downgradePaths} downgrade paths available - useful for rollback scenarios`);
  }
  
  // Identify version clusters with good compatibility
  const compatibleClusters = findCompatibleClusters(matrix, versions);
  if (compatibleClusters.length > 1) {
    recommendations.push(`Consider staying within compatible version clusters: ${compatibleClusters.map(cluster => cluster.join('-')).join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Find clusters of versions with good compatibility
 */
function findCompatibleClusters(matrix, versions) {
  const clusters = [];
  const processed = new Set();
  
  for (const version of versions) {
    if (processed.has(version)) continue;
    
    const cluster = [version];
    processed.add(version);
    
    // Find all versions compatible with this one
    for (const otherVersion of versions) {
      if (processed.has(otherVersion)) continue;
      
      const compatibility = matrix[version][otherVersion];
      if (compatibility.compatible && compatibility.migrationComplexity !== 'high') {
        cluster.push(otherVersion);
        processed.add(otherVersion);
      }
    }
    
    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
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
 * Display historical trends and analytics
 */
function displayHistoricalTrends(historicalData, currentVersion) {
  if (!historicalData.versions || historicalData.versions.length === 0) {
    console.log('📊 Historical Analytics: No historical data available yet');
    return;
  }
  
  console.log('\n📊 Historical Version Analytics:');
  console.log(`   Total Versions Tracked: ${historicalData.analytics.totalVersions}`);
  console.log(`   Version Range: ${historicalData.analytics.firstVersion} → ${currentVersion}`);
  
  if (historicalData.versions.length >= 2) {
    const patterns = analyzeVersionPatterns(historicalData);
    
    console.log('\n📈 Version Change Patterns:');
    patterns.patterns.forEach(pattern => {
      console.log(`   • ${pattern}`);
    });
    
    if (patterns.insights.length > 0) {
      console.log('\n💡 Insights:');
      patterns.insights.forEach(insight => {
        console.log(`   • ${insight}`);
      });
    }
    
    console.log(`\n⚠️ Regression Risk: ${patterns.regressionRisk.toUpperCase()}`);
    console.log(`   Recommended Testing: ${patterns.recommendedTesting}`);
    
    // Display compatibility matrix summary if we have enough data
    if (historicalData.versions.length >= 3) {
      const compatibilityMatrix = generateCompatibilityMatrix(historicalData);
      console.log(`\n🔗 Version Compatibility Matrix:`);
      console.log(`   Compatible Pairs: ${compatibilityMatrix.summary.compatiblePairs}`);
      console.log(`   Incompatible Pairs: ${compatibilityMatrix.summary.incompatiblePairs}`);
      console.log(`   Compatibility Rate: ${compatibilityMatrix.summary.compatibilityRate}%`);
      
      if (compatibilityMatrix.recommendations.length > 0) {
        console.log('\n🎯 Compatibility Recommendations:');
        compatibilityMatrix.recommendations.slice(0, 3).forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
    }
    
    // Show multi-version migration example if we have historical data
    if (historicalData.versions.length >= 2) {
      const oldestVersion = historicalData.versions[historicalData.versions.length - 1]?.sdkVersion;
      const newestVersion = historicalData.versions[0]?.sdkVersion;
      
      if (oldestVersion !== newestVersion && oldestVersion && newestVersion) {
        const migrationPath = generateMultiVersionMigrationPath(oldestVersion, newestVersion, historicalData);
        if (migrationPath.totalSteps > 0) {
          console.log(`\n🛤️ Migration Path (${oldestVersion} → ${newestVersion}):`);
          console.log(`   Steps Required: ${migrationPath.totalSteps}`);
          console.log(`   Breaking Changes: ${migrationPath.totalBreakingChanges}`);
          console.log(`   Estimated Effort: ${migrationPath.estimatedEffort}`);
          
          if (migrationPath.recommendations.length > 0) {
            console.log(`   Top Recommendation: ${migrationPath.recommendations[0]}`);
          }
        }
      }
    }
  } else {
    console.log('   📈 Building historical trend data... (need 2+ versions for analysis)');
  }
  
  console.log(''); // Add spacing
}

/**
 * Detect interface changes between SDK versions
 */
async function detectInterfaceChanges() {
  console.log('🔍 Starting interface change detection...');
  
  try {
    // Step 1: Load cached interface data from previous version
    const cachedData = loadCachedInterfaces();
    const historicalData = loadHistoricalCache();
    
    // Step 2: Extract current interface specifications
    console.log('🔧 Extracting current interface specifications...');
    const currentInterfaces = await extractComponentProps();
    const sdkVersion = await getSDKVersion();
    
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
      const previousVersion = cachedData.sdkVersion || 'unknown';
      const currentVersion = sdkVersion?.version || 'unknown';
      
      console.log('🔄 Comparing interfaces with previous version...');
      console.log(`📊 **Version**: ${previousVersion} → ${currentVersion}`);
      
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
      
      // Check for potential breaking changes based on version changes
      const versionChangeInfo = analyzeVersionChange(previousVersion, currentVersion);
      
      if (changes.summary.breakingChanges > 0) {
        console.log('⚠️ BREAKING CHANGES DETECTED - Review migration guidance');
      } else if (changes.summary.totalChanges > 0) {
        console.log('ℹ️ Non-breaking changes detected - Update when convenient');
      } else if (versionChangeInfo.potentiallyBreaking) {
        console.log(`⚠️ Major version change detected (${previousVersion} → ${currentVersion}) - Interface validation recommended`);
      } else {
        console.log('✅ No interface changes detected');
      }
      
    } else {
      console.log('ℹ️ No previous interfaces to compare against, establishing baseline');
    }
    
    // Step 3.5: Display historical analytics and trends
    displayHistoricalTrends(historicalData, sdkVersion?.version);
    
    // Step 4: Save current interfaces for future comparison
    saveCachedInterfaces(currentInterfaces, sdkVersion?.version);
    
    return {
      success: true,
      currentVersion: sdkVersion?.version || 'unknown',
      previousVersion: cachedData?.sdkVersion || null,
      changes,
      currentInterfaces,
      previousInterfaces: cachedData?.interfaces || null,
      historicalData,
      analytics: {
        patterns: historicalData.versions?.length >= 2 ? analyzeVersionPatterns(historicalData) : null,
        compatibilityMatrix: historicalData.versions?.length >= 3 ? generateCompatibilityMatrix(historicalData) : null
      }
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
  generateMultiVersionMigrationPath,
  generateCompatibilityMatrix,
  analyzeVersionPatterns,
  calculateChangeFrequency,
  loadHistoricalCache,
  displayHistoricalTrends,
  CHANGE_SEVERITY,
  CHANGE_TYPES
};