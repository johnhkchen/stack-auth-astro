# TypeScript Configuration Templates

This directory contains various TypeScript configuration templates optimized for different use cases with Astro + Stack Auth.

## Available Configurations

### 📋 tsconfig.recommended.json
**Best for most projects** - Balanced type safety with developer productivity.
```bash
cp examples/configs/tsconfig.recommended.json tsconfig.json
```

### 🔒 tsconfig.strict.json
**Production-ready with maximum type safety** - Strict rules for enterprise applications.
```bash
cp examples/configs/tsconfig.strict.json tsconfig.json
```

### 🚀 tsconfig.loose.json
**Rapid prototyping** - Minimal type checking for quick development.
```bash
cp examples/configs/tsconfig.loose.json tsconfig.json
```

### 🏗️ tsconfig.bundler.json
**Modern bundlers** - Optimized for Vite, Webpack 5+, and modern build tools.
```bash
cp examples/configs/tsconfig.bundler.json tsconfig.json
```

### 🟢 tsconfig.node16.json
**Node.js 16+ compatibility** - For projects requiring Node.js module resolution.
```bash
cp examples/configs/tsconfig.node16.json tsconfig.json
```

## Configuration Details

| Config | Strict Mode | Type Safety | Use Case |
|--------|-------------|-------------|----------|
| **recommended** | ✅ | High | Most projects |
| **strict** | ✅ | Maximum | Production apps |
| **loose** | ❌ | Low | Prototyping |
| **bundler** | ✅ | High | Modern tooling |
| **node16** | ✅ | High | Node.js compat |

## Key Features

All configurations include:
- ✅ React JSX support for Stack Auth components
- ✅ Astro-specific type definitions
- ✅ Proper module resolution for imports
- ✅ Support for `astro-stack-auth` type definitions

## Usage

1. **Choose a configuration** based on your project needs
2. **Copy to your project root** as `tsconfig.json`
3. **Customize as needed** for your specific requirements

## Customization Examples

### Adding Path Mapping
```json
{
  "extends": "./examples/configs/tsconfig.recommended.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"]
    }
  }
}
```

### Project-Specific Types
```json
{
  "extends": "./examples/configs/tsconfig.recommended.json",
  "compilerOptions": {
    "types": ["astro/client", "react", "react-dom", "your-custom-types"]
  }
}
```

### Environment-Specific Includes
```json
{
  "extends": "./examples/configs/tsconfig.recommended.json",
  "include": [
    "src/**/*",
    "astro.config.mjs",
    "integration-tests/**/*"
  ]
}
```

## Migration Guide

### From JavaScript to TypeScript

1. Start with `tsconfig.loose.json` for minimal friction
2. Gradually migrate to `tsconfig.recommended.json`
3. Eventually adopt `tsconfig.strict.json` for production

### From Other Auth Libraries

When migrating from other authentication libraries:

1. Use `tsconfig.recommended.json` as base
2. Add type definitions for Stack Auth
3. Configure JSX for React components
4. Test with your existing code patterns

## Troubleshooting

### Common Issues

**Module resolution errors:**
- Try `tsconfig.bundler.json` for modern projects
- Use `tsconfig.node16.json` for Node.js compatibility

**Strict type errors:**
- Start with `tsconfig.loose.json`
- Gradually adopt stricter configurations

**React component errors:**
- Ensure `jsx: "react-jsx"` is set
- Verify `jsxImportSource: "react"` is configured

## Best Practices

1. **Start conservative** - Use recommended configuration first
2. **Gradual adoption** - Incrementally increase type safety
3. **Team consistency** - Choose one config for the entire team
4. **Regular updates** - Keep configurations updated with Astro releases