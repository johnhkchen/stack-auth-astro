# Feature: SignUp Component

**GitHub Issue:** #8  
**Title:** User can register new accounts with SignUp component

## Description

As a developer, I want to use Stack Auth's SignUp React component in my Astro project so that users can create new accounts using Stack Auth's pre-built registration UI.

## Acceptance Criteria

- [ ] Stack Auth SignUp component works in Astro islands
- [ ] Component handles registration flow automatically
- [ ] Supports all Stack Auth sign-up methods (OAuth, email)
- [ ] Redirects appropriately after successful registration
- [ ] Form validation and error handling

## Current Implementation Status

🔴 **NOT IMPLEMENTED**

## Test Specification

### Component Import Test

```astro
---
// Test: SignUp component can be imported and used
// pages/signup.astro
import { SignUp } from 'astro-stack-auth/components';
---

<html>
<body>
  <h1>Create Account</h1>
  <!-- Expected: Component renders Stack Auth sign-up UI -->
  <SignUp client:load />
</body>
</html>
```

### Registration Flow Test

```javascript
// Test: SignUp component handles registration flow
// Integration test - component should:
// 1. Render registration form
// 2. Handle form submission
// 3. Communicate with Stack Auth API  
// 4. Redirect on success

const signUpComponent = await import('astro-stack-auth/components');
console.assert(typeof signUpComponent.SignUp === 'function', 'SignUp should be a React component');
```

### Form Validation Test

```javascript
// Test: SignUp component validates form inputs
import { render, fireEvent, screen } from '@testing-library/react';
import { SignUp } from 'astro-stack-auth/components';

render(<SignUp />);

// Submit form with invalid data
const emailInput = screen.getByLabelText('Email');
const submitButton = screen.getByText('Sign Up');

fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
fireEvent.click(submitButton);

// Expected: Validation errors displayed
console.assert(screen.getByText(/valid email/i), 'Should show email validation error');
```

### OAuth Provider Test

```astro
---
// Test: SignUp component supports OAuth providers
import { SignUp } from 'astro-stack-auth/components';
---

<SignUp 
  client:load
  providers={['google', 'github']}
/>

<!-- Expected: OAuth buttons for specified providers shown -->
```

### Success Callback Test

```astro
---
// Test: SignUp component success handling
import { SignUp } from 'astro-stack-auth/components';
---

<SignUp 
  client:load 
  callbackUrl="/welcome"
  onSignUp={(user) => {
    // Expected: Callback fires with user data on successful registration
    console.log('Registration successful:', user);
  }}
/>
```

### Error Handling Test

```javascript
// Test: SignUp component handles registration errors
import { render, fireEvent, screen } from '@testing-library/react';
import { SignUp } from 'astro-stack-auth/components';

const onError = jest.fn();
render(<SignUp onError={onError} />);

// Mock registration failure (email already exists)
// Simulate form submission with existing email
// Expected: Error message displayed and onError called
console.assert(screen.getByText(/email already exists/i), 'Should show duplicate email error');
console.assert(onError.called, 'Should call error handler');
```

### Password Requirements Test

```javascript
// Test: SignUp component enforces password requirements
import { render, fireEvent, screen } from '@testing-library/react';
import { SignUp } from 'astro-stack-auth/components';

render(<SignUp />);

const passwordInput = screen.getByLabelText('Password');
fireEvent.change(passwordInput, { target: { value: 'weak' } });

// Expected: Password strength indicator shown
console.assert(screen.getByText(/password too weak/i), 'Should show password strength error');
```

### Custom Fields Test

```astro
---
// Test: SignUp component with custom fields
import { SignUp } from 'astro-stack-auth/components';
---

<SignUp 
  client:load
  additionalFields={[
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true }
  ]}
/>

<!-- Expected: Additional fields rendered in form -->
```

### Terms of Service Test

```astro
---
// Test: SignUp component with terms acceptance
import { SignUp } from 'astro-stack-auth/components';
---

<SignUp 
  client:load
  requireTermsAcceptance={true}
  termsOfServiceUrl="/terms"
  privacyPolicyUrl="/privacy"
/>

<!-- Expected: Terms and privacy checkboxes required -->
```

## Dependencies

- Re-exports Stack Auth's SignUp component from `@stackframe/stack-ui`
- Requires React integration in Astro
- Stack Auth client configuration
- Proper API endpoints for registration

## Implementation Notes

- Should wrap/re-export Stack Auth's existing SignUp component
- Must work with Astro's island architecture  
- Component should inherit Stack Auth's styling and behavior
- Need to handle Astro-specific routing for redirects
- Should integrate with form validation
- Handle email verification flow if enabled

## Definition of Done

- [ ] SignUp component exported from package
- [ ] Works with all Astro client hydration directives
- [ ] Supports all Stack Auth registration methods
- [ ] Form validation and error handling work
- [ ] Success callbacks and redirects function correctly
- [ ] Tests validate registration functionality