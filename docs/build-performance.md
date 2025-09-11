# Build Performance Guide

## Overview

The `astro-stack-auth` package uses an optimized build system based on `tsup` for fast development and production builds. This guide covers performance best practices and available optimization commands.

## Build Commands

### Development
- `npm run dev` - Standard development build with watch mode
- `npm run dev:fast` - Faster development build (skips TypeScript declarations)
- `npm run build:dev` - Development build (one-time, non-minified)

### Production
- `npm run build` - Optimized production build with minification
- `npm run build:analyze` - Production build + size analysis

### Analysis & Maintenance
- `npm run build:analyze` - Analyze build output and get optimization recommendations
- `npm run build:clean` - Clean build directory
- `npm run build:cache:clean` - Clean build cache

## Performance Optimizations

### Code Splitting
The build system uses intelligent code splitting to:
- Create separate chunks for shared dependencies
- Enable better caching strategies
- Reduce bundle size for consumers

### Watch Mode Optimizations
Development watch mode includes:
- **Faster rebuilds**: Skips TypeScript declaration generation
- **Intelligent ignoring**: Excludes test files, documentation, and other non-source files
- **Incremental compilation**: Only rebuilds changed modules

### Production Optimizations
Production builds include:
- **Minification**: Reduces bundle size
- **Tree shaking**: Removes unused code
- **Source maps**: Optional (disabled for smaller builds)

## Environment-Based Configuration

The build system adapts based on `NODE_ENV`:

```bash
# Development (faster, larger)
NODE_ENV=development npm run build

# Production (optimized, smaller)
NODE_ENV=production npm run build
```

## Build Size Analysis

Run build analysis to understand your bundle:

```bash
npm run build:analyze
```

This provides:
- Total build size breakdown
- File type analysis (JS, maps, types)
- Largest files identification
- Optimization recommendations

## Performance Tips

### For Development
1. Use `npm run dev:fast` for quickest rebuilds
2. Keep source files focused and modular
3. Avoid importing large dependencies in hot paths

### For Production
1. Enable minification with `NODE_ENV=production`
2. Consider disabling source maps for deployment
3. Use code splitting for better caching

### For CI/CD
```bash
# Clean build for reliable CI
npm run build:clean && npm run build

# With analysis for size monitoring
npm run build:analyze
```

## Build Cache

The build system uses intelligent caching:
- **Location**: `node_modules/.tsup/`
- **Clean cache**: `npm run build:cache:clean`
- **Auto-invalidation**: Based on source file changes

## Troubleshooting

### Slow Builds
1. Check if you're using development mode: `npm run dev:fast`
2. Clean build cache: `npm run build:cache:clean`
3. Ensure source files aren't importing test utilities

### Large Bundle Sizes
1. Run `npm run build:analyze` to identify large files
2. Check for accidentally included development dependencies
3. Consider code splitting for large features

### Watch Mode Issues
1. Ensure file watchers aren't hitting system limits
2. Check that ignored patterns are working correctly
3. Restart watch mode: `Ctrl+C` then `npm run dev`

## Performance Benchmarks

Typical build times on modern hardware:
- **Development build**: < 100ms (watch mode rebuild)
- **Production build**: 2-4s (full build with types)
- **Type checking**: 1-2s (can be parallelized)

## Advanced Configuration

For project-specific optimizations, modify `tsup.config.ts`:
- Adjust chunk splitting strategies
- Configure external dependencies
- Customize watch patterns
- Add build hooks