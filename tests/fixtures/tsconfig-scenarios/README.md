# TypeScript Configuration Test Fixtures

This directory contains various TypeScript configuration files used for testing the configuration detection and validation functionality.

## Fixture Files

### minimal.json
- Bare minimum TypeScript configuration
- Tests basic detection functionality

### strict-modern.json
- Modern TypeScript with all strict checks enabled
- Tests handling of comprehensive strict configuration

### legacy-commonjs.json
- Legacy ES5/CommonJS configuration
- Tests backward compatibility with older projects

### react-jsx.json
- React project configuration with JSX support
- Tests JSX handling and path mappings

### monorepo-root.json
- Monorepo root configuration with project references
- Tests composite projects and references

### with-extends.json & base-config.json
- Configuration using extends
- Tests configuration inheritance

### invalid-json.txt
- Malformed JSON with syntax errors
- Tests error handling for invalid configurations

### circular-a.json & circular-b.json
- Circular extends references
- Tests circular dependency detection

## Usage

These fixtures are used by the test files:
- `tests/unit/typescript-config-detection.test.ts`
- `tests/unit/compiler-options-validation.test.ts`
- `tests/integration/typescript-config-integration.test.ts`
- `tests/unit/typescript-config-edge-cases.test.ts`