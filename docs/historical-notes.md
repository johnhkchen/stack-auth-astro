# Historical Notes

This document captures historical context and documentation corrections for the astro-stack-auth project.

## Issue #7: UserButton Component Import Path Correction

**Original Issue:** [#7 - User can display user profile with UserButton component](https://github.com/johnhkchen/stack-auth-astro/issues/7)

### Historical Context

Issue #7 (now closed) originally contained an incorrect import path in its acceptance criteria and test scenario:

**Incorrect Import (as shown in Issue #7):**
```astro
---
import { UserButton } from '@stackframe/astro/components';
---
```

**Correct Import:**
```astro
---
import { UserButton } from 'astro-stack-auth/components';
---
```

### Why This Matters

1. **Package Name:** This is a community integration package named `astro-stack-auth`, not `@stackframe/astro`
2. **Import Path:** All components should be imported from `astro-stack-auth/components`
3. **Documentation:** All active documentation has been corrected to use the proper import path

### Current Status

- Issue #7 is closed and cannot be edited directly
- All documentation files (SPECIFICATION.md, USERBUTTON_VERIFICATION.md, ISSUE_3_VERIFICATION.md) have been updated with the correct import path
- The UserButton component works correctly with the proper import path

### For Developers

Always use the correct import paths:
- `astro-stack-auth/components` - For React components (SignIn, SignUp, UserButton, AccountSettings)
- `astro-stack-auth/server` - For server-side functions (getUser, requireAuth, getSession)
- `astro-stack-auth/client` - For client-side functions (signIn, signOut, redirectToSignIn)

This historical note serves as documentation for why you might see references to `@stackframe/astro/components` in old issues or discussions - it was simply an early documentation error that has since been corrected.