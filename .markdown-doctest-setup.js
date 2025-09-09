// markdown-doctest setup configuration
module.exports = {
  globals: {
    exports: {},
    module: { exports: {} },
    console: console,
    process: process,
    Buffer: Buffer,
    URL: URL,
    Request: Request,
    Response: Response,
    Headers: Headers,
    fetch: fetch,
    window: typeof window !== 'undefined' ? window : {},
    document: typeof document !== 'undefined' ? document : {},
    localStorage: typeof localStorage !== 'undefined' ? localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    },
    sessionStorage: typeof sessionStorage !== 'undefined' ? sessionStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    }
  },
  require: {
    // Node.js built-in modules
    'child_process': {
      execSync: (command, options) => 'mock command output'
    },
    'fs': {
      existsSync: (path) => true,
      readFileSync: (path) => 'mock file content',
      writeFileSync: (path, content) => {}
    },
    
    // Package.json mock
    '../../package.json': {
      name: 'astro-stack-auth',
      dependencies: { '@stackframe/stack': '^0.2.0' },
      peerDependencies: { astro: '^4.0.0' },
      main: './dist/index.js',
      module: './dist/index.mjs',
      types: './dist/index.d.ts',
      exports: {}
    },
    
    // Mock popular testing and framework dependencies that would be used in real implementations
    'vitest': {
      describe: (name, fn) => fn(),
      test: (name, fn) => fn(),
      it: (name, fn) => fn(),
      expect: (value) => ({
        toBe: (expected) => console.assert(value === expected),
        toEqual: (expected) => console.assert(JSON.stringify(value) === JSON.stringify(expected)),
        toContain: (expected) => console.assert(value.includes(expected)),
        toThrow: (expected) => console.assert(true), // Mock implementation
        rejects: {
          toThrow: (expected) => console.assert(true) // Mock implementation
        },
        toHaveBeenCalled: () => console.assert(true),
        toHaveBeenCalledWith: () => console.assert(true)
      }),
      vi: {
        fn: () => ({
          mockResolvedValue: () => {},
          mockRejectedValue: () => {},
          calledWith: true,
          called: true
        }),
        clearAllMocks: () => {}
      },
      beforeEach: (fn) => fn(),
      afterEach: (fn) => fn()
    },
    
    // Mock Astro-specific modules
    'astro/container': {
      experimental_AstroContainer: {
        create: async (config) => ({
          renderToString: async (component, options) => '<div>mock rendered content</div>',
          renderToResponse: async (component, options) => new Response('mock content', { status: 200 }),
          middleware: true,
          internalAPI: {
            routes: [
              { route: '/handler/[...stack]' },
              { route: '/api/auth/[...stack]' }
            ]
          }
        })
      }
    },
    
    // Mock Astro config
    'astro/config': {
      defineConfig: (config) => config,
      getViteConfig: (config) => config
    },
    
    // Mock the integration itself
    'astro-stack-auth': () => ({}),
    'astro-stack-auth/config': {
      projectId: 'test-project-id',
      publishableClientKey: 'test-publishable-key',
      secretServerKey: 'test-secret-key'
    },
    'astro-stack-auth/server': {
      getUser: async (context) => null,
      requireAuth: async (context) => ({ id: '123', displayName: 'Test User' }),
      getSession: async (context) => null
    },
    'astro-stack-auth/client': {
      signIn: async (provider, options) => {},
      signOut: async (options) => {},
      redirectToSignIn: (callbackUrl) => {},
      redirectToSignUp: (callbackUrl) => {},
      redirectToAccount: (callbackUrl) => {}
    },
    'astro-stack-auth/components': {
      SignIn: 'SignIn',
      SignUp: 'SignUp', 
      UserButton: 'UserButton',
      AccountSettings: 'AccountSettings',
      StackProvider: 'StackProvider'
    }
  },
  
  // Skip certain code blocks that are too complex for doctest
  ignore: []
};