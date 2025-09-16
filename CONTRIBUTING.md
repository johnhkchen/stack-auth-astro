# Contributing to astro-stack-auth

Thank you for your interest in contributing to astro-stack-auth! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- A Stack Auth account for testing (free at [stack-auth.com](https://stack-auth.com))

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/stack-auth-astro.git
   cd stack-auth-astro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Stack Auth credentials
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Link for local development**
   ```bash
   npm link
   # In your test Astro project:
   npm link astro-stack-auth
   ```

## Development Workflow

### Project Structure
```
astro-stack-auth/
├── src/              # Source code
│   ├── index.ts      # Main integration
│   ├── server.ts     # Server-side functions
│   ├── client.ts     # Client-side functions
│   ├── components.ts # React component exports
│   └── middleware.ts # Auth middleware
├── spec/             # Markdown specifications
├── tests/            # Test files
├── examples/         # Example projects
└── docs/             # Documentation
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run markdown doctests
npm run docs:test
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Making Changes

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Write clean, documented code
- Follow existing patterns and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes
```bash
# Build the project
npm run build

# Run tests
npm test

# Test in example project
cd examples/minimal-astro
npm install
npm run dev
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `style:` Code style changes
- `chore:` Build/tooling changes

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Requirements
- [ ] Tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description explains changes

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Testing Guidelines

### Unit Tests
Test individual functions in isolation:
```typescript
// tests/server.test.ts
import { describe, it, expect } from 'vitest';
import { getUser } from '../src/server';

describe('getUser', () => {
  it('returns null for unauthenticated requests', async () => {
    const mockContext = createMockContext();
    const user = await getUser(mockContext);
    expect(user).toBeNull();
  });
});
```

### Integration Tests
Test complete authentication flows:
```typescript
// tests/integration/auth-flow.test.ts
import { test, expect } from '@playwright/test';

test('authentication flow', async ({ page }) => {
  await page.goto('/protected');
  // Should redirect to sign-in
  expect(page.url()).toContain('/signin');
});
```

### Documentation Tests
Use markdown-doctest for executable documentation:
```markdown
# spec/features/authentication.md

## Basic Authentication

\```javascript
const user = await requireAuth(context);
console.log(user.id); // User ID
\```
```

## Documentation

### Code Documentation
- Add JSDoc comments to exported functions
- Include parameter descriptions
- Add usage examples

```typescript
/**
 * Get the authenticated user from the request context
 * 
 * @param context - Astro API context
 * @param options - Optional security validation options
 * @returns The authenticated user or null
 * 
 * @example
 * const user = await getUser(Astro);
 * if (user) {
 *   console.log(`Welcome ${user.displayName}`);
 * }
 */
export async function getUser(
  context: APIContext,
  options?: SecurityValidationOptions
): Promise<User | null> {
  // Implementation
}
```

### User Documentation
- Update README.md for user-facing changes
- Add examples for new features
- Update API reference in docs/

## Reporting Issues

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Astro version, Node version, OS)
- Error messages and stack traces

### Feature Requests
Include:
- Use case description
- Proposed API/interface
- Alternative solutions considered
- Impact on existing functionality

## Community

### Getting Help
- Check existing issues and discussions
- Read the documentation
- Ask questions in GitHub Discussions
- Join the Stack Auth Discord

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow the [Contributor Covenant](https://www.contributor-covenant.org/)

## Release Process

Maintainers handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Build and publish to npm
5. Create GitHub release

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.