/**
 * Playwright Configuration for Visual Regression Testing
 * 
 * Configures Playwright for testing Stack Auth components with Astro's
 * island architecture, focusing on visual regression and accessibility testing.
 */

import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  testDir: './tests/visual',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/test-results.json' }],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4321',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global test timeout */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet browsers
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run test:visual:server',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: resolve(__dirname, 'tests/visual/global-setup.ts'),
  globalTeardown: resolve(__dirname, 'tests/visual/global-teardown.ts'),

  /* Test timeout */
  timeout: 30000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 5000,
    toHaveScreenshot: { 
      threshold: 0.2, // Allow 20% pixel difference
      maxDiffPixels: 100
    },
    toMatchScreenshot: { 
      threshold: 0.2,
      maxDiffPixels: 100
    }
  },

  /* Output directories */
  outputDir: 'test-results/',
  snapshotDir: 'tests/visual/screenshots',
  
  /* Test match patterns */
  testMatch: [
    'tests/visual/**/*.test.{js,ts}',
    'tests/a11y/**/*.test.{js,ts}'
  ],

  /* Test ignore patterns */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**'
  ]
});