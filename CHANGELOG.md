# Changelog

All notable changes to the astro-stack-auth project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete Stack Auth integration for Astro projects
- Server-side authentication functions (`getUser`, `getSession`, `requireAuth`)
- Client-side authentication functions (`signIn`, `signOut`, redirect helpers)
- React UI components (`SignIn`, `SignUp`, `UserButton`, `AccountSettings`)
- Automatic middleware integration with `Astro.locals`
- TypeScript support with full type definitions
- Session caching with 5-minute TTL for performance
- Security features (CSRF protection, origin validation, HTTPS enforcement)
- Cross-tab authentication synchronization
- Comprehensive error handling and recovery
- Environment variable configuration
- Custom authentication endpoint prefix support
- Performance monitoring and health checks
- Astro island hydration support for React components
- Automatic React renderer integration
- Protected route patterns for pages and API endpoints

## [0.1.0] - Development Milestones

### Sprint 001 - Foundation & Setup (Completed)
- Initial package structure and configuration
- TypeScript setup with Astro types
- Build system with tsup
- Basic test infrastructure with Vitest
- ESLint and Prettier configuration
- Package.json with proper exports and dependencies

### Sprint 002 - Core Integration (Completed)
- Astro integration hooks implementation
- Route injection for Stack Auth endpoints
- Middleware architecture for auth state
- Environment variable configuration system
- Integration options and validation
- React renderer auto-configuration

### Sprint 003 - Server-Side Authentication (Completed)
- `getUser()` function for retrieving authenticated users
- `getSession()` function for session information
- `requireAuth()` function with automatic redirects
- Security validation options
- Rate limiting capabilities
- Audit logging system
- Performance monitoring
- Comprehensive error handling

### Sprint 004 - Client-Side & Components (Completed)
- Browser-based authentication functions
- React component integration from Stack Auth UI
- Cross-tab synchronization
- Automatic prefix discovery
- Error boundaries for components
- Full hydration directive support
- Client-side state management
- Network resilience features

## Component Versions

### Dependencies
- `@stackframe/stack`: ^2.8.36
- `@stackframe/stack-ui`: ^2.8.36
- Peer Dependencies:
  - `astro`: ^5.0.0
  - `react`: ^18.0.0
  - `react-dom`: ^18.0.0

## Migration Notes

### For auth-astro Users
This package follows similar patterns to auth-astro but targets Stack Auth instead of Auth.js/NextAuth. Key differences:
- Uses Stack Auth's dashboard for provider configuration
- Built-in multi-tenancy and RBAC support
- Different environment variable names (`STACK_*` prefix)
- React components included out-of-the-box

### For New Users
No migration needed - this is the initial release. Follow the installation guide in the README to get started.