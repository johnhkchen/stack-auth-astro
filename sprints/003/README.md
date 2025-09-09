# Sprint 003: Server-side Authentication

**Goal**: Implement server-side authentication helpers (`getUser`, `requireAuth`) and protected page functionality.

**Duration**: 2-3 days  
**Dependency**: Sprint 002 (Core Integration)

## Overview

This sprint builds server-side authentication functionality that works in both Astro pages and API routes, with proper redirects and error handling.

## Tasks

### Task 3.1: User Resolution Functions
- **File**: `task-3.1-user-resolution.md`
- **Deliverable**: `getUser()` and `getSession()` functions
- **Blockers**: Sprint 002 Complete

### Task 3.2: Authentication Requirements  
- **File**: `task-3.2-require-auth.md`
- **Deliverable**: `requireAuth()` with redirect handling
- **Blockers**: Task 3.1

### Task 3.3: Protected API Routes
- **File**: `task-3.3-protected-api.md`
- **Deliverable**: API route authentication with 401 responses
- **Blockers**: Task 3.2

### Task 3.4: Custom Endpoint Prefix Support
- **File**: `task-3.4-custom-prefix.md`
- **Deliverable**: Configurable endpoint prefixes
- **Blockers**: Task 3.3

## Success Criteria

✅ **Feature #2**: Auth state accessible in `Astro.locals`  
✅ **Feature #4**: Protected pages with redirects  
✅ **Feature #6**: Protected API routes  
✅ **Feature #9**: Custom endpoint prefixes  

## Sprint Completion

- [ ] All server-side auth functions working
- [ ] Protected pages redirect correctly  
- [ ] API routes return proper 401 responses
- [ ] Custom prefixes work throughout system