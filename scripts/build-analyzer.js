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

async function analyzeBuild() {
  console.log(chalk.blue('🔍 Analyzing build output...'));
  
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
      
      console.log('\n📊 JSON Metrics:');
      console.log(JSON.stringify(metricsOutput, null, 2));
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