# Development Guide

This guide covers the development workflow for the `astro-stack-auth` integration, including executable specifications, testing, and contribution guidelines.

## Executable Specifications

This project uses **markdown-doctest** for executable specifications, enabling documentation-driven development where specifications contain testable code examples.

### Overview

Executable specifications serve multiple purposes:
- **Living Documentation**: Specifications stay accurate as they're automatically tested
- **Test-Driven Development**: Write specs before implementation to guide development
- **Integration Testing**: Validate that the API works as documented
- **Examples**: Provide working code examples for developers

### Directory Structure

```
spec/
├── features/                   # Feature specifications
│   ├── zero-config-installation.md
│   ├── astro-integration-setup.md
│   ├── server-auth-helpers.md
│   ├── client-auth-functions.md
│   └── ...
├── architecture.md            # Architecture documentation
├── developer-experience.md    # DX requirements
└── testing-strategy.md        # Testing approach
```

### Writing Executable Specifications

#### Specification Format

Each feature specification follows this structure:

```markdown
# Feature: Feature Name

**GitHub Issue:** #N  
**Title:** Brief description

## Description
User story or feature description

## Acceptance Criteria
- [ ] Requirement 1
- [ ] Requirement 2

## Current Implementation Status
🔴 **NOT IMPLEMENTED** / 🟡 **IN PROGRESS** / 🟢 **COMPLETED**

## Test Specification

### Test Name
\`\`\`javascript
// Test: Description of what this test validates
const { functionName } = require('package-name');

// Setup test data
const testData = { ... };

// Execute the function
const result = functionName(testData);

// Assert expected behavior
console.assert(result.success, 'Should succeed with valid input');
\`\`\`
```

#### Code Block Guidelines

**Supported Languages:**
- `javascript` - Node.js/CommonJS code
- `bash` - Shell commands (limited support)

**Best Practices:**
1. **Use console.assert()** for assertions instead of throwing errors
2. **Include descriptive comments** explaining what each test validates
3. **Mock external dependencies** in the setup configuration
4. **Test both success and error cases** where appropriate
5. **Keep tests focused** - one concept per code block

**Example Test Block:**
```javascript
// Test: getUser returns user when authenticated
const { getUser } = require('astro-stack-auth/server');

const mockContext = {
  locals: { user: { id: '123', name: 'Test User' } }
};

const user = await getUser(mockContext);
console.assert(user.id === '123', 'Should return authenticated user');
```

### Mock Configuration

The `.markdown-doctest-setup.cjs` file configures the test environment:

#### Available Globals
- `console`, `process`, `Buffer`, `URL`
- Browser APIs: `window`, `document`, `localStorage`, `sessionStorage`
- Web APIs: `Request`, `Response`, `Headers`, `fetch`

#### Mocked Modules
- **Node.js built-ins**: `child_process`, `fs`
- **Testing frameworks**: `vitest` with expect, describe, test
- **Astro modules**: `astro/config`, `astro/container`
- **Stack Auth**: `@stackframe/stack`, `@stackframe/stack-ui`
- **Integration modules**: `astro-stack-auth/*`

#### Adding New Mocks

To mock a new module, add it to `.markdown-doctest-setup.cjs`:

```javascript
module.exports = {
  require: {
    'your-module': {
      exportedFunction: () => 'mock value',
      exportedConstant: 'mock constant'
    }
  }
};
```

### Running Executable Specifications

#### Individual Files
```bash
# Test a specific specification
npx markdown-doctest --config ./.markdown-doctest-setup.cjs spec/features/zero-config-installation.md
```

#### Test Suites
```bash
# Run all feature specifications
npm run docs:test

# Run sprint specifications  
npm run sprints:test

# Run all specifications
npm run test:all
```

#### With Vitest Integration
```bash
# Run as part of the test suite
npm test

# Watch mode
npm run test:watch
```

### Integration with Development Workflow

#### 1. Feature Development Process

1. **Write Specification**: Create executable spec in `spec/features/`
2. **Run Tests**: Verify spec tests fail (red)
3. **Implement Feature**: Write code to satisfy specification
4. **Validate**: Run spec tests until they pass (green)
5. **Refactor**: Improve implementation while keeping tests green

#### 2. Continuous Integration

Specifications run automatically in CI:
- ✅ Every push and pull request
- ✅ Multiple Node.js versions (18.x, 20.x)  
- ✅ Integrated with unit tests and build validation

#### 3. Documentation Updates

When specifications change:
1. Update the `.md` file with new test cases
2. Run `npm run docs:test` to validate
3. Update implementation if tests fail
4. Commit both specification and implementation changes

### Debugging Executable Specifications

#### Common Issues

**1. Module Not Found**
```
Error: Attempted to require 'module-name' but was not found in config
```

**Solution**: Add the module to `.markdown-doctest-setup.cjs`:
```javascript
require: {
  'module-name': { /* mock implementation */ }
}
```

**2. Process Not Defined**
```
ReferenceError: process is not defined
```

**Solution**: Already configured in globals, check your code block syntax.

**3. Assertion Failures**
```
Assertion failed: Should return user when authenticated
```

**Solution**: Expected during development - implement the feature to make assertions pass.

#### Debugging Tips

1. **Use console.log()** in code blocks to inspect values
2. **Run individual files** to isolate issues
3. **Check the setup file** for available mocks
4. **Verify syntax** of JavaScript code blocks

### Best Practices

#### Specification Writing
- **Start with user stories** to define clear acceptance criteria
- **Write tests before implementation** to guide development
- **Include both positive and negative test cases**
- **Use realistic test data** that represents actual usage
- **Keep specifications focused** on single features

#### Code Quality
- **Descriptive test names** that explain what's being validated
- **Clear assertions** with helpful error messages
- **Consistent mocking** patterns across specifications
- **Regular updates** to keep specs current with implementation

#### Maintenance
- **Review specifications** during code reviews
- **Update mocks** when adding new dependencies
- **Refactor specs** when requirements change
- **Monitor CI results** to catch specification regressions

### Tools and Commands

#### Essential Commands
```bash
# Development workflow
npm run docs:test          # Run feature specifications
npm run docs:test:watch    # Watch feature specifications
npm run test:all          # Run all specifications
npm test                  # Run everything (unit + specs)

# Debugging
npx markdown-doctest --help                               # Show help
npx markdown-doctest --config ./.markdown-doctest-setup.cjs file.md  # Test single file
```

#### File Locations
- **Specifications**: `spec/features/*.md`
- **Configuration**: `.markdown-doctest-setup.cjs`
- **Vitest Integration**: `tests/markdown-doctest.test.ts`
- **CI Configuration**: `.github/workflows/ci.yml`

This executable specification approach ensures our documentation stays accurate and provides working examples for developers integrating Stack Auth with Astro.