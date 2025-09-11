#!/usr/bin/env node
/**
 * Astro Build Size Analyzer
 * Analyzes Astro build output and provides optimization recommendations
 * Designed for example projects that use Astro
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function loadBudgets(budgetPath) {
  try {
    const budgetContent = await fs.readFile(budgetPath, 'utf8');
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
  
  // Check client-side JavaScript budget
  if (envBudgets.budgets.clientJS && analysis.byType.clientJS.size > 0) {
    const jsBudget = envBudgets.budgets.clientJS;
    const maxSize = parseSize(jsBudget.maxSize);
    const warningSize = parseSize(jsBudget.warningSize);
    
    if (analysis.byType.clientJS.size > maxSize) {
      violations.push({
        type: 'clientJS',
        current: analysis.byType.clientJS.size,
        budget: maxSize,
        budgetFormatted: jsBudget.maxSize,
        description: jsBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.clientJS.size > warningSize) {
      warnings.push({
        type: 'clientJS',
        current: analysis.byType.clientJS.size,
        budget: warningSize,
        budgetFormatted: jsBudget.warningSize,
        description: jsBudget.description,
        severity: 'warning'
      });
    }
  }
  
  // Check HTML pages budget
  if (envBudgets.budgets.html && analysis.byType.html.size > 0) {
    const htmlBudget = envBudgets.budgets.html;
    const maxSize = parseSize(htmlBudget.maxSize);
    const warningSize = parseSize(htmlBudget.warningSize);
    
    if (analysis.byType.html.size > maxSize) {
      violations.push({
        type: 'html',
        current: analysis.byType.html.size,
        budget: maxSize,
        budgetFormatted: htmlBudget.maxSize,
        description: htmlBudget.description,
        severity: 'error'
      });
    } else if (analysis.byType.html.size > warningSize) {
      warnings.push({
        type: 'html',
        current: analysis.byType.html.size,
        budget: warningSize,
        budgetFormatted: htmlBudget.warningSize,
        description: htmlBudget.description,
        severity: 'warning'
      });
    }
  }
  
  return { violations, warnings, environment };
}

async function analyzeBuild(distPath = './dist', budgetPath = null) {
  console.log(chalk.blue('🔍 Analyzing Astro build output...'));
  
  // Load performance budgets if provided
  const budgets = budgetPath ? await loadBudgets(budgetPath) : null;
  
  try {
    const files = await fs.readdir(distPath, { recursive: true });
    const analysis = {
      total: 0,
      byType: {
        html: { size: 0, files: [] },
        clientJS: { size: 0, files: [] },
        css: { size: 0, files: [] },
        assets: { size: 0, files: [] },
        other: { size: 0, files: [] }
      }
    };

    for (const file of files) {
      if (typeof file !== 'string') continue;
      
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      
      // Skip directories
      if (stats.isDirectory()) continue;
      
      const size = stats.size;
      const ext = path.extname(file);
      const fileName = path.basename(file);
      
      analysis.total += size;

      // Categorize files based on Astro output structure
      if (ext === '.html') {
        analysis.byType.html.size += size;
        analysis.byType.html.files.push({ file, size });
      } else if (ext === '.js' || ext === '.mjs') {
        // Astro client-side JavaScript
        analysis.byType.clientJS.size += size;
        analysis.byType.clientJS.files.push({ file, size });
      } else if (ext === '.css') {
        analysis.byType.css.size += size;
        analysis.byType.css.files.push({ file, size });
      } else if (file.includes('_astro/') || ext === '.png' || ext === '.jpg' || ext === '.svg' || ext === '.ico') {
        // Astro assets
        analysis.byType.assets.size += size;
        analysis.byType.assets.files.push({ file, size });
      } else {
        analysis.byType.other.size += size;
        analysis.byType.other.files.push({ file, size });
      }
    }

    // Display analysis
    console.log('\n📊 Astro Build Size Analysis:');
    console.log(chalk.green(`Total build size: ${formatBytes(analysis.total)}`));
    
    console.log('\n📁 By file type:');
    Object.entries(analysis.byType).forEach(([type, data]) => {
      if (data.size > 0) {
        const percentage = ((data.size / analysis.total) * 100).toFixed(1);
        const typeNames = {
          html: 'HTML Pages',
          clientJS: 'Client JavaScript',
          css: 'CSS Stylesheets',
          assets: 'Assets (Images, etc)',
          other: 'Other Files'
        };
        console.log(`  ${typeNames[type]}: ${formatBytes(data.size)} (${percentage}%)`);
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

    // Astro-specific optimization recommendations
    console.log('\n💡 Astro Optimization Recommendations:');
    
    if (analysis.byType.clientJS.size > analysis.total * 0.3) {
      console.log(chalk.yellow('  - Consider using client:idle or client:visible directives to reduce initial JS bundle size'));
    }
    
    if (analysis.byType.css.size > analysis.total * 0.2) {
      console.log(chalk.yellow('  - Consider CSS optimization with @astrojs/tailwind or PostCSS'));
    }
    
    if (analysis.byType.assets.size > analysis.total * 0.5) {
      console.log(chalk.yellow('  - Consider image optimization with @astrojs/image or similar'));
    }
    
    if (analysis.byType.html.files.length > 10) {
      console.log(chalk.yellow('  - Consider implementing pagination for large sites'));
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

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const distPath = args[0] || './dist';
  const budgetPath = args[1] || null;
  
  analyzeBuild(distPath, budgetPath);
}

export default analyzeBuild;