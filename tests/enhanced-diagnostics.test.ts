/**
 * Enhanced Error Diagnostics Tests
 * 
 * Tests the enhanced error diagnostics system for type extraction failures.
 */

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { 
  analyzeTypeScriptDiagnostics, 
  generateDiagnosticReport, 
  formatDiagnosticReport,
  validateDependencies,
  ERROR_CATEGORIES
} from '../scripts/enhanced-diagnostics.js';

describe('Enhanced Error Diagnostics', () => {
  describe('TypeScript Diagnostic Analysis', () => {
    it('should categorize module resolution errors', () => {
      const mockDiagnostic = {
        code: 2307,
        messageText: "Cannot find module '@stackframe/stack' or its corresponding type declarations.",
        file: null,
        start: 0
      };
      
      const mockProgram = {} as ts.Program;
      const result = analyzeTypeScriptDiagnostics([mockDiagnostic], mockProgram);
      
      expect(result.categorizedErrors).toHaveLength(1);
      expect(result.categorizedErrors[0].category).toBe(ERROR_CATEGORIES.MODULE_RESOLUTION);
      expect(result.categorizedErrors[0].specificType).toBe('module_not_found');
      expect(result.categorizedErrors[0].actionable).toBe(true);
      expect(result.categorizedErrors[0].moduleName).toBe('@stackframe/stack');
    });

    it('should categorize missing type definition errors', () => {
      const mockDiagnostic = {
        code: 7016,
        messageText: "Try `npm i --save-dev @types/react`",
        file: null,
        start: 0
      };
      
      const mockProgram = {} as ts.Program;
      const result = analyzeTypeScriptDiagnostics([mockDiagnostic], mockProgram);
      
      expect(result.categorizedErrors).toHaveLength(1);
      expect(result.categorizedErrors[0].category).toBe(ERROR_CATEGORIES.TYPE_DEFINITION);
      expect(result.categorizedErrors[0].specificType).toBe('missing_types');
      expect(result.categorizedErrors[0].actionable).toBe(true);
    });

    it('should generate appropriate suggestions for Stack Auth packages', () => {
      const mockDiagnostic = {
        code: 2307,
        messageText: "Cannot find module '@stackframe/stack-ui' or its corresponding type declarations.",
        file: null,
        start: 0
      };
      
      const mockProgram = {} as ts.Program;
      const result = analyzeTypeScriptDiagnostics([mockDiagnostic], mockProgram);
      
      expect(result.suggestions).toHaveLength(2);
      const stackAuthSuggestion = result.suggestions.find(s => 
        s.title.includes('Stack Auth Package Not Found')
      );
      
      expect(stackAuthSuggestion).toBeDefined();
      expect(stackAuthSuggestion.priority).toBe('high');
      expect(stackAuthSuggestion.commands).toContain('npm install @stackframe/stack-ui');
    });

    it('should provide diagnostic summary', () => {
      const mockDiagnostics = [
        {
          code: 2307,
          messageText: "Cannot find module '@stackframe/stack'",
          file: null,
          start: 0
        },
        {
          code: 2304,
          messageText: "Cannot find name 'React'",
          file: null,
          start: 0
        }
      ];
      
      const mockProgram = {} as ts.Program;
      const result = analyzeTypeScriptDiagnostics(mockDiagnostics, mockProgram);
      
      expect(result.summary.total).toBe(2);
      expect(result.summary.actionable).toBe(2);
      expect(result.summary.critical).toBe(2);
      expect(result.summary.byCategory[ERROR_CATEGORIES.MODULE_RESOLUTION]).toBe(1);
      expect(result.summary.byCategory[ERROR_CATEGORIES.DEPENDENCY_MISSING]).toBe(1);
    });
  });

  describe('Dependency Validation', () => {
    it('should validate dependencies and detect missing packages', () => {
      const result = validateDependencies();
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      
      // Should detect missing packages (since we know some are missing in test env)
      if (!result.valid) {
        expect(result.missing.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
        
        // Should have suggestions for missing packages
        const stackAuthSuggestions = result.suggestions.filter(s => 
          s.title.includes('Missing Required Package')
        );
        expect(stackAuthSuggestions.length).toBeGreaterThan(0);
      }
    });

    it('should provide installation commands for missing packages', () => {
      const result = validateDependencies();
      
      if (!result.valid) {
        const stackAuthSuggestion = result.suggestions.find(s => 
          s.title.includes('@stackframe/stack')
        );
        
        if (stackAuthSuggestion) {
          expect(stackAuthSuggestion.commands).toContain('npm install @stackframe/stack');
          expect(stackAuthSuggestion.priority).toBe('high');
        }
      }
    });

    it('should treat React and @types/react as optional dependencies', () => {
      const result = validateDependencies();
      
      // React and @types/react should not cause validation to fail
      const reactSuggestions = result.suggestions.filter(s => 
        s.title.includes('Optional Package') && 
        (s.title.includes('react') || s.title.includes('@types/react'))
      );
      
      // If React packages are missing, they should be marked as optional (low priority)
      reactSuggestions.forEach(suggestion => {
        expect(suggestion.type).toBe('info');
        expect(suggestion.priority).toBe('low');
        expect(suggestion.description).toContain('not required for basic type extraction');
      });
      
      // Missing React packages should not affect validity for basic extraction
      const requiredMissing = result.missing.filter(pkg => 
        !['react', '@types/react'].includes(pkg)
      );
      
      // Validity should only be affected by truly required packages
      if (requiredMissing.length === 0) {
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Diagnostic Report Generation', () => {
    it('should generate comprehensive diagnostic report', () => {
      const error = new Error('Test type extraction failure');
      const context = {
        extractionPhase: 'test',
        diagnostics: [{
          code: 2307,
          messageText: "Cannot find module '@stackframe/stack'",
          file: null,
          start: 0
        }],
        program: {} as ts.Program
      };
      
      const report = generateDiagnosticReport(error, context);
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('error');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('dependencies');
      expect(report).toHaveProperty('suggestions');
      expect(report).toHaveProperty('troubleshootingSteps');
      
      expect(report.error.message).toBe('Test type extraction failure');
      expect(report.environment.node).toBeDefined();
      expect(report.environment.platform).toBeDefined();
    });

    it('should include environment information', () => {
      const error = new Error('Test error');
      const report = generateDiagnosticReport(error);
      
      expect(report.environment.node).toMatch(/^v\d+\.\d+\.\d+/);
      expect(report.environment.platform).toBeDefined();
      expect(report.environment.typescript).toBeDefined();
      expect(report.environment.npm).toBeDefined();
    });

    it('should generate troubleshooting steps', () => {
      const error = new Error('Test error');
      const report = generateDiagnosticReport(error);
      
      expect(Array.isArray(report.troubleshootingSteps)).toBe(true);
      expect(report.troubleshootingSteps.length).toBeGreaterThan(0);
      
      const steps = report.troubleshootingSteps;
      expect(steps[0]).toHaveProperty('step');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('description');
      expect(steps[0]).toHaveProperty('commands');
      expect(steps[0]).toHaveProperty('expected');
    });
  });

  describe('Diagnostic Report Formatting', () => {
    it('should format diagnostic report for user display', () => {
      const error = new Error('Test formatting error');
      const report = generateDiagnosticReport(error);
      const formatted = formatDiagnosticReport(report);
      
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('Type Extraction Diagnostic Report');
      expect(formatted).toContain('Error Summary:');
      expect(formatted).toContain('Environment:');
      expect(formatted).toContain('Dependencies:');
      expect(formatted).toContain('Troubleshooting Steps:');
    });

    it('should include high priority suggestions in formatted output', () => {
      const error = new Error('Test error with suggestions');
      const report = generateDiagnosticReport(error);
      
      // Add a high priority suggestion
      report.suggestions.push({
        type: 'error',
        priority: 'high',
        title: 'Test High Priority Issue',
        description: 'This is a test high priority issue',
        action: 'Take immediate action',
        commands: ['npm test'],
        links: []
      });
      
      const formatted = formatDiagnosticReport(report);
      
      expect(formatted).toContain('Immediate Actions:');
      expect(formatted).toContain('Test High Priority Issue');
      expect(formatted).toContain('npm test');
    });

    it('should show TypeScript analysis when available', () => {
      const error = new Error('TypeScript error');
      const mockDiagnostics = [{
        code: 2307,
        messageText: "Cannot find module 'test'",
        file: null,
        start: 0
      }];
      
      const report = generateDiagnosticReport(error, {
        diagnostics: mockDiagnostics,
        program: {} as ts.Program
      });
      
      const formatted = formatDiagnosticReport(report);
      
      expect(formatted).toContain('TypeScript Analysis:');
      expect(formatted).toContain('Total errors:');
      expect(formatted).toContain('Actionable errors:');
    });
  });

  describe('Error Categories', () => {
    it('should have all expected error categories', () => {
      expect(ERROR_CATEGORIES.DEPENDENCY_MISSING).toBe('dependency_missing');
      expect(ERROR_CATEGORIES.COMPILATION_ERROR).toBe('compilation_error');
      expect(ERROR_CATEGORIES.MODULE_RESOLUTION).toBe('module_resolution');
      expect(ERROR_CATEGORIES.TYPE_DEFINITION).toBe('type_definition');
      expect(ERROR_CATEGORIES.CONFIGURATION).toBe('configuration');
      expect(ERROR_CATEGORIES.VERSION_COMPATIBILITY).toBe('version_compatibility');
      expect(ERROR_CATEGORIES.PERMISSION).toBe('permission');
      expect(ERROR_CATEGORIES.NETWORK).toBe('network');
      expect(ERROR_CATEGORIES.UNKNOWN).toBe('unknown');
    });
  });
});