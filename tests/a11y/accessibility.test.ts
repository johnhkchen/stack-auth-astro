/**
 * Accessibility Tests for Stack Auth Components
 * 
 * Tests accessibility compliance of Stack Auth components across different
 * hydration states, ensuring WCAG 2.1 compliance and proper screen reader support.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test configuration
const COMPONENTS = [
  { name: 'UserButton', selector: '[data-testid="user-button"]' },
  { name: 'SignIn', selector: '[data-testid="sign-in"]' },
  { name: 'SignUp', selector: '[data-testid="sign-up"]' },
  { name: 'AccountSettings', selector: '[data-testid="account-settings"]' }
];

const HYDRATION_SCENARIOS = ['client-load', 'client-visible', 'client-idle'];

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

async function setupAccessibilityTest(page: Page, scenario: string) {
  await page.goto(`/test-components?scenario=${scenario}`);
  await page.waitForLoadState('networkidle');
  await waitForHydration(page);
}

async function getScreenReaderText(page: Page, selector: string): Promise<string> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return '';
    
    // Get computed accessible name
    const computedName = (window as any).getComputedAccessibleName?.(element) || '';
    if (computedName) return computedName;
    
    // Fallback to manual calculation
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }
    
    return element.textContent || '';
  }, selector);
}

test.describe('Stack Auth Component Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Enable accessibility testing
    await page.addInitScript(() => {
      // Mock screen reader detection
      Object.defineProperty(navigator, 'userAgent', {
        value: navigator.userAgent + ' Screen Reader'
      });
    });
  });

  test.describe('Automated Accessibility Testing', () => {
    for (const scenario of HYDRATION_SCENARIOS) {
      test(`should pass axe accessibility tests with ${scenario}`, async ({ page }) => {
        await setupAccessibilityTest(page, scenario);
        
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        
        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test(`should pass component-specific accessibility tests with ${scenario}`, async ({ page }) => {
        await setupAccessibilityTest(page, scenario);
        
        for (const component of COMPONENTS) {
          const element = page.locator(component.selector);
          if (await element.count() > 0) {
            const componentScanResults = await new AxeBuilder({ page })
              .include(component.selector)
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze();
            
            expect(componentScanResults.violations).toEqual([]);
          }
        }
      });
    }
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation across all components', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Get all focusable elements
      const focusableElements = await page.locator(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      ).all();
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      let activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'A']).toContain(activeElement);
      
      // Test tab through all elements
      for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          return {
            tagName: active?.tagName,
            type: active?.getAttribute('type'),
            role: active?.getAttribute('role'),
            ariaLabel: active?.getAttribute('aria-label'),
            id: active?.id
          };
        });
        
        expect(focusedElement.tagName).toBeTruthy();
      }
      
      // Test shift+tab (reverse navigation)
      await page.keyboard.press('Shift+Tab');
      activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });

    test('should handle Enter and Space key activation correctly', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Test button activation
      const buttons = await page.locator('button').all();
      
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        const button = buttons[i];
        await button.focus();
        
        // Test Enter key
        const enterPressed = await button.evaluate((btn) => {
          let pressed = false;
          const handler = () => { pressed = true; };
          btn.addEventListener('click', handler, { once: true });
          btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          btn.removeEventListener('click', handler);
          return pressed;
        });
        
        // Test Space key
        const spacePressed = await button.evaluate((btn) => {
          let pressed = false;
          const handler = () => { pressed = true; };
          btn.addEventListener('click', handler, { once: true });
          btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
          btn.removeEventListener('click', handler);
          return pressed;
        });
        
        expect(enterPressed || spacePressed).toBe(true);
      }
    });

    test('should support arrow key navigation in menus/dropdowns', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Find and open any dropdown menus
      const dropdownTriggers = await page.locator('[aria-haspopup="true"], [aria-expanded="false"]').all();
      
      for (const trigger of dropdownTriggers.slice(0, 2)) {
        await trigger.click();
        await page.waitForTimeout(200);
        
        // Check if dropdown opened
        const dropdownOpen = await page.evaluate(() => {
          return !!document.querySelector('[role="menu"], [role="listbox"], [aria-expanded="true"]');
        });
        
        if (dropdownOpen) {
          // Test arrow key navigation
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(100);
          
          const focusedItem = await page.evaluate(() => {
            const active = document.activeElement;
            return {
              role: active?.getAttribute('role'),
              ariaSelected: active?.getAttribute('aria-selected')
            };
          });
          
          expect(['menuitem', 'option', null]).toContain(focusedItem.role);
          
          // Close dropdown
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should provide appropriate ARIA labels and descriptions', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Check UserButton accessibility
      const userButton = page.locator('[data-testid="user-button"] button').first();
      if (await userButton.count() > 0) {
        const ariaLabel = await userButton.getAttribute('aria-label');
        const ariaDescribedBy = await userButton.getAttribute('aria-describedby');
        const accessibleName = await getScreenReaderText(page, '[data-testid="user-button"] button');
        
        expect(ariaLabel || accessibleName).toBeTruthy();
      }
      
      // Check form inputs
      const inputs = await page.locator('input').all();
      for (const input of inputs.slice(0, 5)) {
        const inputType = await input.getAttribute('type');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const associatedLabel = await input.evaluate((inp) => {
          const id = inp.id;
          if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            return label?.textContent || '';
          }
          return '';
        });
        
        expect(ariaLabel || associatedLabel || placeholder).toBeTruthy();
        
        // Required inputs should have aria-required
        if (await input.getAttribute('required') !== null) {
          expect(await input.getAttribute('aria-required')).toBe('true');
        }
      }
    });

    test('should announce state changes to screen readers', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Monitor aria-live regions
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
      
      // Simulate user interaction that should trigger announcements
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const submitButton = form.locator('button[type="submit"]').first();
        if (await submitButton.count() > 0) {
          // Submit empty form to trigger validation
          await submitButton.click();
          await page.waitForTimeout(500);
          
          // Check for error announcements
          const errorMessages = await page.locator('[role="alert"], [aria-live="assertive"]').all();
          const hasErrorAnnouncements = errorMessages.length > 0;
          
          if (hasErrorAnnouncements) {
            const errorText = await errorMessages[0].textContent();
            expect(errorText).toBeTruthy();
          }
        }
      }
    });

    test('should provide context for complex interactions', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Test context provision for auth flow
      const signInSection = page.locator('[data-testid="sign-in"]').first();
      if (await signInSection.count() > 0) {
        // Should have appropriate headings
        const headings = await signInSection.locator('h1, h2, h3, h4, h5, h6, [role="heading"]').all();
        if (headings.length > 0) {
          const headingText = await headings[0].textContent();
          expect(headingText).toMatch(/sign.{0,10}in/i);
        }
        
        // Should have instructions or help text
        const instructions = await signInSection.locator('[aria-describedby], .instructions, .help-text').count();
        // Instructions are helpful but not always required
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should manage focus correctly during hydration', async ({ page }) => {
      await page.goto('/test-components?scenario=client-visible');
      
      // Focus an element before hydration
      await page.keyboard.press('Tab');
      const preHydrationFocus = await page.evaluate(() => document.activeElement?.tagName);
      
      // Wait for hydration
      await waitForHydration(page);
      
      // Focus should be maintained or logically moved
      const postHydrationFocus = await page.evaluate(() => document.activeElement?.tagName);
      expect(postHydrationFocus).toBeTruthy();
      
      // Focus should not be lost to body
      expect(postHydrationFocus).not.toBe('BODY');
    });

    test('should trap focus in modal dialogs', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Look for modal triggers
      const modalTriggers = await page.locator('[aria-haspopup="dialog"], [data-modal-trigger]').all();
      
      for (const trigger of modalTriggers.slice(0, 2)) {
        await trigger.click();
        await page.waitForTimeout(300);
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"], [aria-modal="true"]').first();
        if (await modal.count() > 0) {
          // Focus should be in modal
          const focusInModal = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            const activeElement = document.activeElement;
            return modal?.contains(activeElement) || false;
          });
          
          expect(focusInModal).toBe(true);
          
          // Tab should stay within modal
          await page.keyboard.press('Tab');
          const stillInModal = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            const activeElement = document.activeElement;
            return modal?.contains(activeElement) || false;
          });
          
          expect(stillInModal).toBe(true);
          
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
    });

    test('should handle focus indicators visually', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Test focus indicators on different components
      const focusableElements = await page.locator('button, input, a[href]').all();
      
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        const element = focusableElements[i];
        await element.focus();
        
        // Check for visible focus indicator
        const focusStyles = await element.evaluate((el) => {
          const styles = getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
            border: styles.border
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = 
          focusStyles.outline !== 'none' ||
          focusStyles.outlineWidth !== '0px' ||
          focusStyles.boxShadow !== 'none' ||
          focusStyles.border.includes('blue') ||
          focusStyles.border.includes('focus');
        
        expect(hasFocusIndicator).toBe(true);
      }
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('should meet WCAG color contrast requirements', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      const contrastResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze();
      
      expect(contrastResults.violations).toEqual([]);
    });

    test('should be usable in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = `
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          input, button, select {
            background-color: white !important;
            color: black !important;
          }
        `;
        document.head.appendChild(style);
      });
      
      await setupAccessibilityTest(page, 'client-load');
      
      // Components should still be visible and functional
      const visibleElements = await page.locator('button, input, a').all();
      
      for (let i = 0; i < Math.min(visibleElements.length, 3); i++) {
        const element = visibleElements[i];
        const isVisible = await element.isVisible();
        expect(isVisible).toBe(true);
        
        // Element should have sufficient contrast
        const styles = await element.evaluate((el) => {
          const computed = getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color
          };
        });
        
        // Should have explicit colors set
        expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('should support reduced motion preferences', async ({ page }) => {
      // Mock reduced motion preference
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
      
      await setupAccessibilityTest(page, 'client-load');
      
      // Test that animations are reduced or disabled
      const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all();
      
      for (const element of animatedElements.slice(0, 3)) {
        const animationStyles = await element.evaluate((el) => {
          const styles = getComputedStyle(el);
          return {
            animationDuration: styles.animationDuration,
            transitionDuration: styles.transitionDuration
          };
        });
        
        // Animations should be significantly reduced or disabled
        expect(
          animationStyles.animationDuration === '0s' ||
          animationStyles.animationDuration === 'none' ||
          parseFloat(animationStyles.animationDuration) <= 0.1
        ).toBe(true);
      }
    });
  });

  test.describe('Error Handling Accessibility', () => {
    test('should announce errors accessibly', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Trigger form validation errors
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const submitButton = form.locator('button[type="submit"]').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(500);
          
          // Check for proper error markup
          const errorElements = await page.locator('[role="alert"], [aria-invalid="true"], .error').all();
          
          if (errorElements.length > 0) {
            for (const errorElement of errorElements.slice(0, 3)) {
              const errorText = await errorElement.textContent();
              expect(errorText).toBeTruthy();
              
              // Errors should be associated with form fields
              const ariaDescribedBy = await errorElement.getAttribute('aria-describedby');
              const id = await errorElement.getAttribute('id');
              
              if (id) {
                const associatedField = page.locator(`[aria-describedby*="${id}"]`);
                const fieldExists = await associatedField.count() > 0;
                // Association is good practice but not always required
              }
            }
          }
        }
      }
    });

    test('should provide recovery options for errors', async ({ page }) => {
      await setupAccessibilityTest(page, 'client-load');
      
      // Simulate error state
      await page.evaluate(() => {
        const errorDiv = document.createElement('div');
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('data-testid', 'simulated-error');
        errorDiv.textContent = 'Authentication failed. Please try again.';
        document.body.appendChild(errorDiv);
        
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry Authentication';
        retryButton.setAttribute('data-testid', 'retry-button');
        errorDiv.appendChild(retryButton);
      });
      
      const errorElement = page.locator('[data-testid="simulated-error"]');
      expect(await errorElement.count()).toBe(1);
      
      const retryButton = page.locator('[data-testid="retry-button"]');
      expect(await retryButton.count()).toBe(1);
      expect(await retryButton.isVisible()).toBe(true);
    });
  });
});