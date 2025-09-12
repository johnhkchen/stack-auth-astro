/**
 * Visual Regression Tests for Stack Auth Components
 * 
 * Tests visual consistency of Stack Auth components across different
 * hydration strategies, themes, and device sizes.
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const HYDRATION_SCENARIOS = [
  { name: 'client-load', directive: 'client:load' },
  { name: 'client-visible', directive: 'client:visible' },
  { name: 'client-idle', directive: 'client:idle' },
  { name: 'client-media-mobile', directive: 'client:media="(max-width: 768px)"' },
  { name: 'client-media-desktop', directive: 'client:media="(min-width: 769px)"' }
];

const COMPONENTS = [
  { name: 'UserButton', selector: '[data-testid="user-button"]' },
  { name: 'SignIn', selector: '[data-testid="sign-in"]' },
  { name: 'SignUp', selector: '[data-testid="sign-up"]' },
  { name: 'AccountSettings', selector: '[data-testid="account-settings"]' }
];

// Helper functions
async function waitForHydration(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const trackers = document.querySelectorAll('[data-hydration-state]');
      return Array.from(trackers).every(tracker => 
        tracker.getAttribute('data-hydration-state') === 'hydrated'
      );
    },
    { timeout }
  );
}

async function setupTestPage(page: Page, scenario: string) {
  await page.goto(`/test-components?scenario=${scenario}`);
  await page.waitForLoadState('networkidle');
  await waitForHydration(page);
}

test.describe('Stack Auth Component Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common test environment
    await page.setExtraHTTPHeaders({
      'X-Test-Mode': 'true'
    });
  });

  test.describe('Component Rendering Across Hydration Strategies', () => {
    for (const scenario of HYDRATION_SCENARIOS) {
      test(`should render components consistently with ${scenario.name}`, async ({ page }) => {
        await setupTestPage(page, scenario.name);
        
        // Take full page screenshot
        await expect(page).toHaveScreenshot(`${scenario.name}-full-page.png`);
        
        // Test individual components
        for (const component of COMPONENTS) {
          const element = page.locator(component.selector);
          if (await element.count() > 0) {
            await expect(element.first()).toHaveScreenshot(
              `${scenario.name}-${component.name.toLowerCase()}.png`
            );
          }
        }
      });
    }
  });

  test.describe('Responsive Design Testing', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1200, height: 800 },
      { name: 'wide', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should render components correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setupTestPage(page, 'client-load');
        
        // Full page screenshot
        await expect(page).toHaveScreenshot(`responsive-${viewport.name}-full.png`);
        
        // Component screenshots
        for (const component of COMPONENTS) {
          const element = page.locator(component.selector);
          if (await element.count() > 0) {
            await expect(element.first()).toHaveScreenshot(
              `responsive-${viewport.name}-${component.name.toLowerCase()}.png`
            );
          }
        }
      });
    }
  });

  test.describe('Theme and Style Variations', () => {
    const themes = ['light', 'dark', 'system'];
    
    for (const theme of themes) {
      test(`should render components correctly with ${theme} theme`, async ({ page }) => {
        // Set theme preference
        await page.addInitScript((theme) => {
          localStorage.setItem('theme-preference', theme);
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        await setupTestPage(page, 'client-load');
        
        // Wait for theme to apply
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot(`theme-${theme}-full.png`);
        
        // Component screenshots with theme
        for (const component of COMPONENTS) {
          const element = page.locator(component.selector);
          if (await element.count() > 0) {
            await expect(element.first()).toHaveScreenshot(
              `theme-${theme}-${component.name.toLowerCase()}.png`
            );
          }
        }
      });
    }
  });

  test.describe('Interactive State Testing', () => {
    test('should capture hover states correctly', async ({ page }) => {
      await setupTestPage(page, 'client-load');
      
      // Test hover states for interactive components
      const userButton = page.locator('[data-testid="user-button"] button').first();
      if (await userButton.count() > 0) {
        // Normal state
        await expect(userButton).toHaveScreenshot('user-button-normal.png');
        
        // Hover state
        await userButton.hover();
        await page.waitForTimeout(200); // Wait for hover animation
        await expect(userButton).toHaveScreenshot('user-button-hover.png');
      }
      
      // Test form inputs
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.count() > 0) {
        // Empty state
        await expect(emailInput).toHaveScreenshot('input-empty.png');
        
        // Focused state
        await emailInput.focus();
        await expect(emailInput).toHaveScreenshot('input-focused.png');
        
        // Filled state
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveScreenshot('input-filled.png');
      }
    });

    test('should capture focus states correctly', async ({ page }) => {
      await setupTestPage(page, 'client-load');
      
      // Test keyboard focus indicators
      const focusableElements = await page.locator('button, input, [tabindex]').all();
      
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        const element = focusableElements[i];
        await element.focus();
        await page.waitForTimeout(100);
        
        const elementType = await element.evaluate(el => {
          if (el.tagName === 'BUTTON') return 'button';
          if (el.tagName === 'INPUT') return 'input';
          return 'focusable';
        });
        
        await expect(element).toHaveScreenshot(`focus-${elementType}-${i}.png`);
      }
    });

    test('should capture error states correctly', async ({ page }) => {
      await setupTestPage(page, 'client-load');
      
      // Simulate form validation errors
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const submitButton = form.locator('button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(500);
          
          // Capture form with validation errors
          await expect(form).toHaveScreenshot('form-validation-errors.png');
        }
      }
    });
  });

  test.describe('Loading and Animation States', () => {
    test('should capture loading states during hydration', async ({ page }) => {
      // Slow down network to capture loading states
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      await page.goto('/test-components?scenario=client-load');
      
      // Capture early loading state
      await expect(page).toHaveScreenshot('loading-initial.png');
      
      // Wait for partial hydration
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('loading-partial.png');
      
      // Wait for full hydration
      await waitForHydration(page);
      await expect(page).toHaveScreenshot('loading-complete.png');
    });

    test('should capture animation states', async ({ page }) => {
      await setupTestPage(page, 'client-load');
      
      // Test modal/dropdown animations if present
      const userButton = page.locator('[data-testid="user-button"] button').first();
      if (await userButton.count() > 0) {
        await userButton.click();
        
        // Capture animation frames
        await page.waitForTimeout(100);
        await expect(page).toHaveScreenshot('dropdown-opening.png');
        
        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot('dropdown-open.png');
      }
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      await setupTestPage(page, 'client-load');
      
      // Browser-specific screenshot
      await expect(page).toHaveScreenshot(`cross-browser-${browserName}.png`);
      
      // Test specific browser quirks
      if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page.locator('[data-testid="user-button"]').first())
          .toHaveScreenshot(`safari-user-button.png`);
      }
      
      if (browserName === 'firefox') {
        // Firefox-specific tests
        await expect(page.locator('form').first())
          .toHaveScreenshot(`firefox-form.png`);
      }
    });
  });

  test.describe('High Contrast and Accessibility Modes', () => {
    test('should render correctly in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        document.documentElement.style.setProperty('--contrast-mode', 'high');
        document.documentElement.classList.add('high-contrast');
      });
      
      await setupTestPage(page, 'client-load');
      
      await expect(page).toHaveScreenshot('high-contrast-full.png');
      
      for (const component of COMPONENTS) {
        const element = page.locator(component.selector);
        if (await element.count() > 0) {
          await expect(element.first()).toHaveScreenshot(
            `high-contrast-${component.name.toLowerCase()}.png`
          );
        }
      }
    });

    test('should render correctly with reduced motion', async ({ page }) => {
      // Simulate reduced motion preference
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => {},
          }),
        });
      });
      
      await setupTestPage(page, 'client-load');
      
      await expect(page).toHaveScreenshot('reduced-motion-full.png');
    });
  });

  test.describe('Component Combinations', () => {
    test('should render component combinations correctly', async ({ page }) => {
      await setupTestPage(page, 'complete-suite');
      
      // Full suite screenshot
      await expect(page).toHaveScreenshot('complete-suite-full.png');
      
      // Individual sections
      const sections = [
        'auth-section',
        'user-section', 
        'settings-section',
        'provider-section'
      ];
      
      for (const section of sections) {
        const element = page.locator(`[data-testid="${section}"]`);
        if (await element.count() > 0) {
          await expect(element.first()).toHaveScreenshot(`suite-${section}.png`);
        }
      }
    });
  });

  test.describe('Performance Visual Testing', () => {
    test('should not have visual regressions with performance optimizations', async ({ page }) => {
      // Test with performance budgets enabled
      await page.goto('/test-components?performance=true&scenario=client-load');
      await waitForHydration(page);
      
      // Components should look the same regardless of performance optimizations
      await expect(page).toHaveScreenshot('performance-optimized.png');
      
      // Compare with non-optimized version
      await page.goto('/test-components?performance=false&scenario=client-load');
      await waitForHydration(page);
      
      await expect(page).toHaveScreenshot('performance-standard.png');
    });
  });
});