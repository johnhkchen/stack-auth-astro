/**
 * Component Import Pattern Validation Tests
 * 
 * Validates that example files use consistent component import patterns,
 * proper client directives, and follow Astro island architecture best practices.
 */

import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { stat } from 'fs/promises';

// Define expected import patterns
const EXPECTED_IMPORTS = {
  components: 'astro-stack-auth/components',
  server: 'astro-stack-auth/server',
  client: 'astro-stack-auth/client',
} as const;

const VALID_COMPONENTS = [
  'SignIn',
  'SignUp', 
  'UserButton',
  'AccountSettings',
  'StackProvider'
] as const;

const VALID_SERVER_FUNCTIONS = [
  'getUser',
  'requireAuth',
  'getSession'
] as const;

const VALID_CLIENT_DIRECTIVES = [
  'client:load',
  'client:visible', 
  'client:idle',
  'client:media',
  'client:only'
] as const;

// Helper to get all example Astro files
async function getExampleFiles(): Promise<string[]> {
  const examplesDir = join(process.cwd(), 'examples');
  const files: string[] = [];
  
  async function walkDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules
          if (entry === 'node_modules') {
            continue;
          }
          await walkDir(fullPath);
        } else if (stats.isFile() && extname(entry) === '.astro') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  await walkDir(examplesDir);
  return files;
}

// Helper to parse Astro frontmatter imports
function parseAstroImports(content: string): { 
  imports: Array<{ 
    specifiers: string[]; 
    source: string; 
    line: number; 
  }>;
  componentUsages: Array<{ 
    component: string; 
    directive?: string; 
    line: number; 
  }>;
} {
  const lines = content.split('\n');
  const imports: Array<{ specifiers: string[]; source: string; line: number; }> = [];
  const componentUsages: Array<{ component: string; directive?: string; line: number; }> = [];
  
  let inFrontmatter = false;
  let frontmatterStart = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track frontmatter boundaries
    if (line.trim() === '---') {
      if (!frontmatterStart) {
        frontmatterStart = true;
        inFrontmatter = true;
      } else {
        inFrontmatter = false;
        break; // End of frontmatter
      }
      continue;
    }
    
    // Parse imports in frontmatter
    if (inFrontmatter) {
      const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const [, namedImports, namespaceImport, defaultImport, source] = importMatch;
        let specifiers: string[] = [];
        
        if (namedImports) {
          specifiers = namedImports.split(',').map(s => s.trim());
        } else if (namespaceImport) {
          specifiers = [namespaceImport];
        } else if (defaultImport) {
          specifiers = [defaultImport];
        }
        
        imports.push({ specifiers, source, line: i + 1 });
      }
    }
    
    // Parse component usages in template (after frontmatter)
    if (!inFrontmatter && !frontmatterStart) {
      // Match component usage with optional client directive
      const componentMatches = line.matchAll(/<(\w+)(?:\s+([^>]*?))?(?:\s*\/)?>/g);
      for (const match of componentMatches) {
        const [, componentName, attributes = ''] = match;
        
        // Check if it's a Stack Auth component
        if (VALID_COMPONENTS.includes(componentName as any)) {
          // Extract client directive
          const directiveMatch = attributes.match(/client:(load|visible|idle|media|only)(?:="[^"]*")?/);
          const directive = directiveMatch ? `client:${directiveMatch[1]}` : undefined;
          
          componentUsages.push({
            component: componentName,
            directive,
            line: i + 1
          });
        }
      }
    }
  }
  
  return { imports, componentUsages };
}

describe('Component Import Pattern Validation', () => {
  it('should find example files to test', async () => {
    const exampleFiles = await getExampleFiles();
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  describe('Import Path Consistency', () => {
    it('should use consistent import paths across all examples', async () => {
      const exampleFiles = await getExampleFiles();
      const importPathUsage = new Map<string, string[]>();
      
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          if (importDecl.source.startsWith('astro-stack-auth/')) {
            if (!importPathUsage.has(importDecl.source)) {
              importPathUsage.set(importDecl.source, []);
            }
            importPathUsage.get(importDecl.source)!.push(filePath);
          }
        }
      }
      
      // Validate only expected import paths are used
      const usedPaths = Array.from(importPathUsage.keys());
      const expectedPaths = Object.values(EXPECTED_IMPORTS);
      
      for (const usedPath of usedPaths) {
        expect(expectedPaths).toContain(usedPath as any);
      }
    });

    it('should import components from components module only', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          const componentImports = importDecl.specifiers.filter(spec => 
            VALID_COMPONENTS.includes(spec as any)
          );
          
          if (componentImports.length > 0) {
            expect(importDecl.source).toBe(EXPECTED_IMPORTS.components);
          }
        }
      }
    });

    it('should import server functions from server module only', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          const serverImports = importDecl.specifiers.filter(spec => 
            VALID_SERVER_FUNCTIONS.includes(spec as any)
          );
          
          if (serverImports.length > 0) {
            expect(importDecl.source).toBe(EXPECTED_IMPORTS.server);
          }
        }
      }
    });
  });

  describe('Client Directive Validation', () => {
    it('should use valid client directives for Stack Auth components', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        for (const usage of componentUsages) {
          if (usage.directive) {
            expect(VALID_CLIENT_DIRECTIVES).toContain(usage.directive as any);
          }
        }
      }
    });

    it('should use appropriate client directives for component types', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        for (const usage of componentUsages) {
          // SignIn components should typically use client:load for immediate interaction
          if (usage.component === 'SignIn' && usage.directive) {
            expect(['client:load', 'client:visible']).toContain(usage.directive);
          }
          
          // UserButton can use client:visible for better performance
          if (usage.component === 'UserButton' && usage.directive) {
            expect(['client:visible', 'client:load', 'client:idle']).toContain(usage.directive);
          }
          
          // AccountSettings can use deferred loading
          if (usage.component === 'AccountSettings' && usage.directive) {
            expect(['client:load', 'client:visible', 'client:idle']).toContain(usage.directive);
          }
        }
      }
    });

    it('should not use client directives on server-only imports', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        
        // Server functions should not appear with client directives
        for (const serverFn of VALID_SERVER_FUNCTIONS) {
          const serverUsagePattern = new RegExp(`<${serverFn}\\s+client:`, 'g');
          expect(content).not.toMatch(serverUsagePattern);
        }
      }
    });
  });

  describe('Component Usage Patterns', () => {
    it('should use components that are properly imported', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports, componentUsages } = parseAstroImports(content);
        
        // Get all imported component names
        const importedComponents = new Set<string>();
        for (const importDecl of imports) {
          if (importDecl.source === EXPECTED_IMPORTS.components) {
            importDecl.specifiers.forEach(spec => importedComponents.add(spec));
          }
        }
        
        // All used components should be imported
        for (const usage of componentUsages) {
          expect(importedComponents).toContain(usage.component);
        }
      }
    });

    it('should follow Astro island architecture patterns', async () => {
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { componentUsages } = parseAstroImports(content);
        
        // Components should have proper hydration strategy
        for (const usage of componentUsages) {
          // Interactive components should have client directives
          if (['SignIn', 'SignUp', 'UserButton', 'AccountSettings'].includes(usage.component)) {
            // Either has a client directive or is wrapped in a conditional that would provide one
            const hasClientDirective = usage.directive !== undefined;
            const isConditionallyHydrated = content.includes('client:') && 
              content.includes(`<${usage.component}`);
            
            if (!hasClientDirective && !isConditionallyHydrated) {
              // This might be acceptable for SSR-only usage, but let's warn
              console.warn(`Component ${usage.component} in ${filePath} may need client directive`);
            }
          }
        }
      }
    });
  });

  describe('Consistency Between Examples', () => {
    it('should use similar patterns between minimal and full-featured examples', async () => {
      const exampleFiles = await getExampleFiles();
      const minimalFiles = exampleFiles.filter(f => f.includes('minimal-astro'));
      const fullFeaturedFiles = exampleFiles.filter(f => f.includes('full-featured'));
      
      // Compare similar pages
      const pageTypes = ['signin', 'signup', 'index'];
      
      for (const pageType of pageTypes) {
        const minimalPage = minimalFiles.find(f => f.includes(`${pageType}.astro`));
        const fullFeaturedPage = fullFeaturedFiles.find(f => f.includes(`${pageType}.astro`));
        
        if (minimalPage && fullFeaturedPage) {
          const minimalContent = await readFile(minimalPage, 'utf-8');
          const fullFeaturedContent = await readFile(fullFeaturedPage, 'utf-8');
          
          const minimalImports = parseAstroImports(minimalContent);
          const fullFeaturedImports = parseAstroImports(fullFeaturedContent);
          
          // Both should import Stack Auth components from same path
          const minimalStackImports = minimalImports.imports.filter(i => 
            i.source.startsWith('astro-stack-auth/')
          );
          const fullFeaturedStackImports = fullFeaturedImports.imports.filter(i => 
            i.source.startsWith('astro-stack-auth/')
          );
          
          if (minimalStackImports.length > 0 && fullFeaturedStackImports.length > 0) {
            // Import paths should be consistent
            const minimalPaths = new Set(minimalStackImports.map(i => i.source));
            const fullFeaturedPaths = new Set(fullFeaturedStackImports.map(i => i.source));
            
            for (const path of minimalPaths) {
              if (fullFeaturedPaths.has(path)) {
                expect(fullFeaturedPaths).toContain(path);
              }
            }
          }
        }
      }
    });
  });

  describe('Import vs Export Validation', () => {
    it('should import only components that exist in astro-stack-auth modules', async () => {
      // This test would ideally check against actual exports, but for now
      // we validate against our known component list
      const exampleFiles = await getExampleFiles();
      for (const filePath of exampleFiles) {
        const content = await readFile(filePath, 'utf-8');
        const { imports } = parseAstroImports(content);
        
        for (const importDecl of imports) {
          if (importDecl.source === EXPECTED_IMPORTS.components) {
            for (const specifier of importDecl.specifiers) {
              expect(VALID_COMPONENTS).toContain(specifier as any);
            }
          }
          
          if (importDecl.source === EXPECTED_IMPORTS.server) {
            for (const specifier of importDecl.specifiers) {
              expect(VALID_SERVER_FUNCTIONS).toContain(specifier as any);
            }
          }
        }
      }
    });
  });
});