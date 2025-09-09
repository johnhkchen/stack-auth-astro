# stack-auth-astro
Community Astro integration of @stackframe/stack

## Stack Auth Compatibility

This integration is compatible with Stack Auth version `^2.8.36`.

### Dependencies
- `@stackframe/stack`: ^2.8.36 - Core Stack Auth SDK
- `@stackframe/stack-ui`: ^2.8.36 - Stack Auth React UI components

### Development Commands
- `npm run stack:validate` - Validate Stack Auth packages are properly installed
- `npm run stack:reinstall` - Reinstall Stack Auth packages if needed

### Troubleshooting
If you encounter import errors with Stack Auth packages:
1. Run `npm run stack:validate` to check package installation
2. If packages are missing dist folders, run `npm run stack:reinstall`
3. Clear npm cache and reinstall: `npm ci`
