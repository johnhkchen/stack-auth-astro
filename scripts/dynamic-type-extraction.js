#!/usr/bin/env node

/**
 * Dynamic Type Extraction System
 * 
 * Orchestrates the extraction of component prop specifications from
 * @stackframe/stack-ui TypeScript types at build time, with fallback
 * to static specifications when needed.
 */

import { extractComponentProps, getSDKVersion, validateExtractedTypes, detectAndParseTypeScriptConfig } from './type-extractor.js';
import { 
  detectSDKVersions, 
  getVersionCompatibility, 
  validateSDKInstallation,
  shouldAttemptTypeExtraction,
  generateVersionReport
} from './sdk-version-detector.js';
import { 
  generateDiagnosticReport, 
  formatDiagnosticReport,
  setVerboseMode 
} from './enhanced-diagnostics.js';

/**
 * Main dynamic type extraction orchestrator
 */
async function extractDynamicTypes() {
  console.log('🚀 Starting dynamic type extraction...');
  
  // Check for verbose mode
  const verboseMode = process.env.STACK_AUTH_VERBOSE === 'true' || process.argv.includes('--verbose');
  setVerboseMode(verboseMode);
  
  if (verboseMode) {
    console.log('🔍 Verbose mode enabled - detailed diagnostics will be shown');
  }
  
  try {
    // Step 1: Detect and parse consumer TypeScript configuration
    console.log('🔧 Detecting consumer project TypeScript configuration...');
    const tsConfigResult = detectAndParseTypeScriptConfig();
    
    // Step 2: Detect SDK versions
    const sdkVersions = detectSDKVersions();
    
    // Step 3: Get compatibility information
    const compatibility = getVersionCompatibility(sdkVersions);
    
    // Step 4: Validate installation
    const validation = validateSDKInstallation(sdkVersions, compatibility);
    
    // Step 5: Generate version report (enhanced with TypeScript config info)
    const report = generateVersionReport(sdkVersions, compatibility, validation, tsConfigResult);
    
    // Step 6: Decide whether to attempt type extraction
    const shouldExtract = shouldAttemptTypeExtraction(compatibility, validation);
    
    if (!shouldExtract) {
      console.log('ℹ️ Dynamic type extraction skipped, using static fallback');
      return {
        success: false,
        extractedTypes: null,
        report,
        tsConfigResult,
        reason: 'Type extraction not supported or SDK validation failed',
        sdkVersion: compatibility.detectedVersion || 'Unknown'
      };
    }
    
    // Step 7: Extract component props from TypeScript (now using consumer's config)
    console.log('🔧 Extracting component props from @stackframe/stack-ui...');
    console.log(`   Using TypeScript config from: ${tsConfigResult.source}`);
    
    const extractedProps = await extractComponentProps();
    
    if (!extractedProps) {
      const error = new Error('TypeScript compilation or type extraction failed');
      const diagnosticReport = generateDiagnosticReport(error, {
        sdkVersions,
        compatibility,
        validation,
        tsConfigResult
      });
      
      console.log('⚠️ Type extraction failed, using static fallback');
      
      if (verboseMode) {
        console.log('\n📋 Enhanced Failure Diagnostics:');
        console.log(formatDiagnosticReport(diagnosticReport));
      } else {
        console.log('💡 For detailed failure analysis, run with --verbose or set STACK_AUTH_VERBOSE=true');
        
        // Show critical suggestions only
        const criticalSuggestions = diagnosticReport.suggestions.filter(s => s.priority === 'high').slice(0, 2);
        if (criticalSuggestions.length > 0) {
          console.log('💡 Quick fixes:');
          criticalSuggestions.forEach(suggestion => {
            console.log(`   • ${suggestion.title}: ${suggestion.action}`);
          });
        }
      }
      
      return {
        success: false,
        extractedTypes: null,
        report,
        tsConfigResult,
        reason: 'TypeScript compilation or type extraction failed',
        diagnosticReport: verboseMode ? diagnosticReport : null,
        sdkVersion: compatibility.detectedVersion || 'Unknown'
      };
    }
    
    // Step 8: Validate extracted types
    const validatedTypes = validateExtractedTypes(extractedProps);
    
    if (Object.keys(validatedTypes).length === 0) {
      console.log('⚠️ No valid types extracted, using static fallback');
      return {
        success: false,
        extractedTypes: null,
        report,
        tsConfigResult,
        reason: 'Extracted types failed validation',
        sdkVersion: compatibility.detectedVersion || 'Unknown'
      };
    }
    
    console.log(`✅ Successfully extracted types for ${Object.keys(validatedTypes).length} components`);
    console.log(`   TypeScript configuration: ${tsConfigResult.success ? 'Consumer project' : 'Fallback'}`);
    
    return {
      success: true,
      extractedTypes: validatedTypes,
      report,
      tsConfigResult,
      componentCount: Object.keys(validatedTypes).length,
      sdkVersion: compatibility.detectedVersion,
      typeScriptConfig: {
        source: tsConfigResult.source,
        configPath: tsConfigResult.configPath,
        warnings: tsConfigResult.warnings
      }
    };
    
  } catch (error) {
    console.error(`❌ Dynamic type extraction failed: ${error.message}`);
    
    // Try to get tsconfig info even in error case
    let tsConfigResult = null;
    try {
      tsConfigResult = detectAndParseTypeScriptConfig();
    } catch (configError) {
      console.warn('⚠️ Could not detect TypeScript config during error recovery');
    }
    
    // Generate comprehensive diagnostic report
    const diagnosticReport = generateDiagnosticReport(error, {
      extractionPhase: 'orchestration',
      tsConfigResult
    });
    
    if (verboseMode) {
      console.error('\n📋 Comprehensive Error Analysis:');
      console.error(formatDiagnosticReport(diagnosticReport));
    } else {
      console.error('Stack trace:', error.stack);
      console.error('💡 For comprehensive error analysis, run with --verbose or set STACK_AUTH_VERBOSE=true');
      
      // Show immediate actions only
      const immediateActions = diagnosticReport.suggestions.filter(s => s.priority === 'high').slice(0, 3);
      if (immediateActions.length > 0) {
        console.error('💡 Immediate actions to try:');
        immediateActions.forEach((action, index) => {
          console.error(`   ${index + 1}. ${action.title}: ${action.action}`);
        });
      }
    }
    
    return {
      success: false,
      extractedTypes: null,
      tsConfigResult,
      error: error.message,
      reason: 'Unexpected error during type extraction',
      diagnosticReport: verboseMode ? diagnosticReport : null,
      sdkVersion: 'Unknown'
    };
  }
}

/**
 * Merge dynamic and static type specifications
 * Dynamic types take precedence, static types provide fallback
 */
function mergeTypeSpecifications(dynamicTypes, staticTypes) {
  const merged = { ...staticTypes };
  
  if (!dynamicTypes) {
    console.log('ℹ️ Using static type specifications only');
    return merged;
  }
  
  console.log('🔄 Merging dynamic and static type specifications...');
  
  for (const [componentName, dynamicProps] of Object.entries(dynamicTypes)) {
    if (staticTypes[componentName]) {
      // Merge dynamic props with static fallback
      const staticProps = staticTypes[componentName];
      const mergedProps = {};
      
      // Start with static props as base
      for (const [propName, staticSpec] of Object.entries(staticProps)) {
        mergedProps[propName] = staticSpec;
      }
      
      // Override/add dynamic props
      for (const [propName, dynamicSpec] of Object.entries(dynamicProps)) {
        mergedProps[propName] = {
          ...mergedProps[propName], // Keep static description/metadata if available
          ...dynamicSpec, // Override with dynamic type info
          source: 'dynamic' // Mark as dynamically extracted
        };
      }
      
      merged[componentName] = mergedProps;
      console.log(`✅ Merged ${Object.keys(dynamicProps).length} dynamic props with ${Object.keys(staticProps).length} static props for ${componentName}`);
    } else {
      // Component not in static specs, use dynamic only
      merged[componentName] = {
        ...dynamicTypes[componentName],
        source: 'dynamic'
      };
      console.log(`✅ Added new component ${componentName} from dynamic extraction`);
    }
  }
  
  return merged;
}

/**
 * Generate enhanced version compatibility with dynamic type info
 */
function enhanceVersionCompatibility(staticCompatibility, report) {
  const enhanced = { ...staticCompatibility };
  
  if (report.sdkVersions['@stackframe/stack-ui']) {
    const version = report.sdkVersions['@stackframe/stack-ui'].version;
    const majorMinor = version.split('.').slice(0, 2).join('.');
    
    // Add detected version to compatibility matrix
    enhanced[`${majorMinor}.x`] = {
      props: [], // Will be filled from extracted types
      deprecated: [],
      source: 'dynamic',
      detectedAt: report.timestamp,
      sdkVersion: version
    };
  }
  
  return enhanced;
}

/**
 * Create comprehensive extraction result for documentation generator
 */
function createExtractionResult(extractionResult, staticSpecs, staticCompatibility) {
  const result = {
    timestamp: new Date().toISOString(),
    dynamicExtractionSucceeded: extractionResult.success,
    sdkVersionDetected: extractionResult.report?.sdkVersions?.['@stackframe/stack-ui']?.version || 'unknown',
    
    // Component specifications (merged dynamic + static)
    componentSpecs: mergeTypeSpecifications(extractionResult.extractedTypes, staticSpecs),
    
    // Enhanced version compatibility
    versionCompatibility: enhanceVersionCompatibility(staticCompatibility, extractionResult.report || {}),
    
    // Metadata
    extractionReport: extractionResult.report,
    fallbackReason: extractionResult.reason || null,
    componentCount: extractionResult.componentCount || Object.keys(staticSpecs).length,
    
    // Recommendations for users
    recommendations: generateUserRecommendations(extractionResult)
  };
  
  return result;
}

/**
 * Generate recommendations for users based on extraction results
 */
function generateUserRecommendations(extractionResult) {
  const recommendations = [];
  
  if (!extractionResult.success) {
    recommendations.push({
      type: 'warning',
      message: 'Dynamic type extraction failed, using static fallback',
      action: 'Ensure @stackframe/stack-ui is properly installed and accessible'
    });
  }
  
  if (extractionResult.report?.validation?.warnings?.length > 0) {
    recommendations.push({
      type: 'info', 
      message: 'SDK version compatibility warnings detected',
      action: 'Review the compatibility matrix and consider updating packages'
    });
  }
  
  if (extractionResult.success && extractionResult.componentCount > 0) {
    recommendations.push({
      type: 'success',
      message: `Successfully extracted types for ${extractionResult.componentCount} components`,
      action: 'Documentation will automatically reflect the exact SDK types you have installed'
    });
  }
  
  return recommendations;
}

// Run as CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running dynamic type extraction...');
  extractDynamicTypes()
    .then(result => {
      console.log('\n📊 Extraction Result:');
      console.log(`  Success: ${result.success}`);
      console.log(`  Component Count: ${result.componentCount || 'N/A'}`);
      console.log(`  SDK Version: ${result.sdkVersion || 'Unknown'}`);
      
      if (result.reason) {
        console.log(`  Reason: ${result.reason}`);
      }
      
      if (result.extractedTypes) {
        console.log('\n📋 Extracted Components:');
        for (const [name, props] of Object.entries(result.extractedTypes)) {
          console.log(`  ${name}: ${Object.keys(props).length} props`);
        }
      }
      
      console.log('\n✅ Type extraction completed');
    })
    .catch(error => {
      console.error('❌ Type extraction failed:', error);
      process.exit(1);
    });
}

export {
  extractDynamicTypes,
  mergeTypeSpecifications,
  enhanceVersionCompatibility,
  createExtractionResult
};