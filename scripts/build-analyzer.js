#!/usr/bin/env node
/**
 * Build Size Analyzer
 * Analyzes build output and provides optimization recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const budgetsFile = path.join(__dirname, '..', 'performance-budgets.json');

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseSize(sizeString) {
  const units = { 'b': 1, 'kb': 1024, 'mb': 1024 * 1024, 'gb': 1024 * 1024 * 1024 };
  const match = sizeString.toLowerCase().match(/^([0-9.]+)\s*(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Invalid size format: ${sizeString}`);
  return parseFloat(match[1]) * units[match[2]];
}

async function loadBudgets() {
  try {
    const budgetContent = await fs.readFile(budgetsFile, 'utf8');
    return JSON.parse(budgetContent);
  } catch (error) {
    console.warn(chalk.yellow('⚠️  No performance budgets found, skipping budget validation'));
    return null;
  }
}

function getBudgetViolations(analysis, budgets) {
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const envBudgets = budgets.environments[environment] || budgets.environments[budgets.defaultEnvironment];
  
  const violations = [];
  const warnings = [];
  
  // Check total size budget
  if (envBudgets.budgets.total) {
    const totalBudget = envBudgets.budgets.total;
    const maxSize = parseSize(totalBudget.maxSize);
    const warningSize = parseSize(totalBudget.warningSize);
    
    if (analysis.total > maxSize) {
      violations.push({
        type: 'total',
        current: analysis.total,
        budget: maxSize,
        budgetFormatted: totalBudget.maxSize,
        description: totalBudget.description,
        severity: 'error'
      });
    } else if (analysis.total > warningSize) {
      warnings.push({
        type: 'total',
        current: analysis.total,
        budget: warningSize,
        budgetFormatted: totalBudget.warningSize,
        description: totalBudget.description,
        severity: 'warning'
      });
    }
  }
  
  // Check JavaScript budget
  if (envBudgets.budgets.javascript && analysis.byType.js.size > 0) {
    const jsBudget = envBudgets.budgets.javascript;
    const maxSize = parseSize(jsBudget.maxSize);
    const warningSize = parseSize(jsBudget.warningSize);
    
    if (analysis.byType.js.size > maxSize) {
      violations.push({
        type: 'javascript',
        current: analysis.byType.js.size,
        budget: maxSize,
        budgetFormatted: jsBudget.maxSize,
        description: jsBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.js.size > warningSize) {
      warnings.push({
        type: 'javascript',
        current: analysis.byType.js.size,
        budget: warningSize,
        budgetFormatted: jsBudget.warningSize,
        description: jsBudget.description,
        severity: 'warning'
      });
    }
  }
  
  // Check TypeScript declaration files budget
  if (envBudgets.budgets.typescript && analysis.byType.dts.size > 0) {
    const dtsBudget = envBudgets.budgets.typescript;
    const maxSize = parseSize(dtsBudget.maxSize);
    const warningSize = parseSize(dtsBudget.warningSize);
    
    if (analysis.byType.dts.size > maxSize) {
      violations.push({
        type: 'typescript',
        current: analysis.byType.dts.size,
        budget: maxSize,
        budgetFormatted: dtsBudget.maxSize,
        description: dtsBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.dts.size > warningSize) {
      warnings.push({
        type: 'typescript',
        current: analysis.byType.dts.size,
        budget: warningSize,
        budgetFormatted: dtsBudget.warningSize,
        description: dtsBudget.description,
        severity: 'warning'
      });
    }
  }
  
  // Check sourcemaps budget
  if (envBudgets.budgets.sourcemaps && analysis.byType.map.size > 0) {
    const mapBudget = envBudgets.budgets.sourcemaps;
    const maxSize = parseSize(mapBudget.maxSize);
    const warningSize = parseSize(mapBudget.warningSize);
    
    if (analysis.byType.map.size > maxSize) {
      violations.push({
        type: 'sourcemaps',
        current: analysis.byType.map.size,
        budget: maxSize,
        budgetFormatted: mapBudget.maxSize,
        description: mapBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.map.size > warningSize) {
      warnings.push({
        type: 'sourcemaps',
        current: analysis.byType.map.size,
        budget: warningSize,
        budgetFormatted: mapBudget.warningSize,
        description: mapBudget.description,
        severity: 'warning'
      });
    }
  }
  
  // Check chunks budget
  if (envBudgets.budgets.chunks && analysis.byType.chunks.size > 0) {
    const chunksBudget = envBudgets.budgets.chunks;
    const maxSize = parseSize(chunksBudget.maxSize);
    const warningSize = parseSize(chunksBudget.warningSize);
    
    if (analysis.byType.chunks.size > maxSize) {
      violations.push({
        type: 'chunks',
        current: analysis.byType.chunks.size,
        budget: maxSize,
        budgetFormatted: chunksBudget.maxSize,
        description: chunksBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.chunks.size > warningSize) {
      warnings.push({
        type: 'chunks',
        current: analysis.byType.chunks.size,
        budget: warningSize,
        budgetFormatted: chunksBudget.warningSize,
        description: chunksBudget.description,
        severity: 'warning'
      });
    }
  }
  
  return { violations, warnings, environment };
}

async function analyzeBuild() {
  console.log(chalk.blue('🔍 Analyzing build output...'));
  
  // Load performance budgets
  const budgets = await loadBudgets();
  
  try {
    const files = await fs.readdir(distDir, { recursive: true });
    const analysis = {
      total: 0,
      byType: {
        js: { size: 0, files: [] },
        map: { size: 0, files: [] },
        dts: { size: 0, files: [] },
        chunks: { size: 0, files: [] }
      }
    };

    for (const file of files) {
      if (typeof file !== 'string') continue;
      
      const filePath = path.join(distDir, file);
      const size = await getFileSize(filePath);
      const ext = path.extname(file);
      
      analysis.total += size;

      if (ext === '.map') {
        analysis.byType.map.size += size;
        analysis.byType.map.files.push({ file, size });
      } else if (file.includes('.d.')) {
        analysis.byType.dts.size += size;
        analysis.byType.dts.files.push({ file, size });
      } else if (file.includes('chunk-') || file.includes('chunks/')) {
        analysis.byType.chunks.size += size;
        analysis.byType.chunks.files.push({ file, size });
      } else if (ext === '.mjs' || ext === '.cjs') {
        analysis.byType.js.size += size;
        analysis.byType.js.files.push({ file, size });
      }
    }

    // Display analysis
    console.log('\n📊 Build Size Analysis:');
    console.log(chalk.green(`Total build size: ${formatBytes(analysis.total)}`));
    
    console.log('\n📁 By file type:');
    Object.entries(analysis.byType).forEach(([type, data]) => {
      if (data.size > 0) {
        const percentage = ((data.size / analysis.total) * 100).toFixed(1);
        console.log(`  ${type.toUpperCase()}: ${formatBytes(data.size)} (${percentage}%)`);
      }
    });

    // Top 5 largest files
    const allFiles = Object.values(analysis.byType)
      .flatMap(type => type.files)
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    if (allFiles.length > 0) {
      console.log('\n📋 Largest files:');
      allFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.file}: ${formatBytes(file.size)}`);
      });
    }

    // Optimization recommendations
    console.log('\n💡 Optimization Recommendations:');
    
    if (analysis.byType.map.size > analysis.byType.js.size * 0.5) {
      console.log(chalk.yellow('  - Consider disabling source maps for production builds'));
    }
    
    if (analysis.byType.chunks.size < analysis.byType.js.size * 0.1) {
      console.log(chalk.yellow('  - Code splitting could be improved for better caching'));
    }
    
    if (analysis.total > 1024 * 1024) { // 1MB
      console.log(chalk.yellow('  - Consider enabling minification for production builds'));
    }
    
    // Check budget violations
    let budgetResult = null;
    if (budgets) {
      budgetResult = getBudgetViolations(analysis, budgets);
      
      console.log(`\n📊 Budget Check (${budgetResult.environment} environment):`);
      
      if (budgetResult.violations.length === 0 && budgetResult.warnings.length === 0) {
        console.log(chalk.green('  ✅ All budgets satisfied!'));
      } else {
        if (budgetResult.violations.length > 0) {
          console.log(chalk.red(`  ❌ ${budgetResult.violations.length} budget violation(s):`));
          budgetResult.violations.forEach(v => {
            console.log(chalk.red(`    • ${v.type}: ${formatBytes(v.current)} > ${v.budgetFormatted} (${v.description})`));
          });
        }
        
        if (budgetResult.warnings.length > 0) {
          console.log(chalk.yellow(`  ⚠️  ${budgetResult.warnings.length} budget warning(s):`));
          budgetResult.warnings.forEach(w => {
            console.log(chalk.yellow(`    • ${w.type}: ${formatBytes(w.current)} > ${w.budgetFormatted} (${w.description})`));
          });
        }
      }
    }
    
    console.log(chalk.green('  ✅ Analysis complete!'));
    
    // Output JSON metrics for CI consumption
    if (process.env.CI || process.env.OUTPUT_JSON) {
      const metricsOutput = {
        timestamp: new Date().toISOString(),
        totalSize: analysis.total,
        totalSizeFormatted: formatBytes(analysis.total),
        byType: Object.entries(analysis.byType).reduce((acc, [type, data]) => {
          acc[type] = {
            size: data.size,
            sizeFormatted: formatBytes(data.size),
            percentage: ((data.size / analysis.total) * 100).toFixed(1),
            fileCount: data.files.length
          };
          return acc;
        }, {}),
        largestFiles: allFiles.map(f => ({
          name: f.file,
          size: f.size,
          sizeFormatted: formatBytes(f.size)
        }))
      };
      
      // Add budget information to metrics output
      if (budgetResult) {
        metricsOutput.budgetCheck = {
          environment: budgetResult.environment,
          violations: budgetResult.violations.map(v => ({
            type: v.type,
            current: v.current,
            currentFormatted: formatBytes(v.current),
            budget: v.budget,
            budgetFormatted: v.budgetFormatted,
            description: v.description,
            severity: v.severity,
            excess: v.current - v.budget,
            excessFormatted: formatBytes(v.current - v.budget)
          })),
          warnings: budgetResult.warnings.map(w => ({
            type: w.type,
            current: w.current,
            currentFormatted: formatBytes(w.current),
            budget: w.budget,
            budgetFormatted: w.budgetFormatted,
            description: w.description,
            severity: w.severity,
            excess: w.current - w.budget,
            excessFormatted: formatBytes(w.current - w.budget)
          })),
          passed: budgetResult.violations.length === 0,
          hasWarnings: budgetResult.warnings.length > 0
        };
      }
      
      console.log('\n📊 JSON Metrics:');
      console.log(JSON.stringify(metricsOutput, null, 2));
    }
    
    // Handle budget violations for CI
    if (budgetResult && budgetResult.violations.length > 0) {
      if (budgets.reporting?.failOnBudgetExceeded !== false) {
        console.error(chalk.red('\n❌ Build failed due to budget violations'));
        process.exit(1);
      }
    }
    
    if (budgetResult && budgetResult.warnings.length > 0) {
      if (budgets.reporting?.warnOnBudgetWarning !== false && process.env.STRICT_BUDGETS === 'true') {
        console.error(chalk.yellow('\n⚠️  Build failed due to budget warnings (STRICT_BUDGETS=true)'));
        process.exit(1);
      }
    }
    
    return analysis;
  } catch (error) {
    console.error(chalk.red('Error analyzing build:', error.message));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBuild();
}

export default analyzeBuild;