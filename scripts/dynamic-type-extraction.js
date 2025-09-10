#!/usr/bin/env node

/**
 * Dynamic Type Extraction System
 * 
 * Orchestrates the extraction of component prop specifications from
 * @stackframe/stack-ui TypeScript types at build time, with fallback
 * to static specifications when needed.
 */

import { extractComponentProps, getSDKVersion, validateExtractedTypes } from './type-extractor.js';
import { 
  detectSDKVersions, 
  getVersionCompatibility, 
  validateSDKInstallation,
  shouldAttemptTypeExtraction,
  generateVersionReport
} from './sdk-version-detector.js';

/**
 * Main dynamic type extraction orchestrator
 */
async function extractDynamicTypes() {
  console.log('🚀 Starting dynamic type extraction...');
  
  try {
    // Step 1: Detect SDK versions
    const sdkVersions = detectSDKVersions();
    
    // Step 2: Get compatibility information
    const compatibility = getVersionCompatibility(sdkVersions);
    
    // Step 3: Validate installation
    const validation = validateSDKInstallation(sdkVersions, compatibility);
    
    // Step 4: Generate version report
    const report = generateVersionReport(sdkVersions, compatibility, validation);
    
    // Step 5: Decide whether to attempt type extraction
    const shouldExtract = shouldAttemptTypeExtraction(compatibility, validation);
    
    if (!shouldExtract) {
      console.log('ℹ️ Dynamic type extraction skipped, using static fallback');
      return {
        success: false,
        extractedTypes: null,
        report,
        reason: 'Type extraction not supported or SDK validation failed'
      };
    }
    
    // Step 6: Extract component props from TypeScript
    console.log('🔧 Extracting component props from @stackframe/stack-ui...');
    const extractedProps = extractComponentProps();
    
    if (!extractedProps) {
      console.log('⚠️ Type extraction failed, using static fallback');
      return {
        success: false,
        extractedTypes: null,
        report,
        reason: 'TypeScript compilation or type extraction failed'
      };
    }
    
    // Step 7: Validate extracted types
    const validatedTypes = validateExtractedTypes(extractedProps);
    
    if (Object.keys(validatedTypes).length === 0) {
      console.log('⚠️ No valid types extracted, using static fallback');
      return {
        success: false,
        extractedTypes: null,
        report,
        reason: 'Extracted types failed validation'
      };
    }
    
    console.log(`✅ Successfully extracted types for ${Object.keys(validatedTypes).length} components`);
    
    return {
      success: true,
      extractedTypes: validatedTypes,
      report,
      componentCount: Object.keys(validatedTypes).length,
      sdkVersion: compatibility.detectedVersion
    };
    
  } catch (error) {
    console.error(`❌ Dynamic type extraction failed: ${error.message}`);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      extractedTypes: null,
      error: error.message,
      reason: 'Unexpected error during type extraction'
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