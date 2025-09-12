/**
 * Hydration configuration for Stack Auth component testing
 * 
 * This file defines different hydration scenarios and test configurations
 * for comprehensive component integration testing.
 */

export interface HydrationScenario {
  name: string;
  directive: 'load' | 'visible' | 'idle' | 'media' | 'only';
  mediaQuery?: string;
  framework?: 'react' | 'vue' | 'svelte';
  description: string;
  expectedBehavior: string;
  performanceExpectations: {
    maxHydrationTime?: number;
    maxRenderTime?: number;
    maxMemoryUsage?: number;
  };
}

export const hydrationScenarios: HydrationScenario[] = [
  {
    name: 'client-load',
    directive: 'load',
    description: 'Component hydrates immediately when page loads',
    expectedBehavior: 'Should be interactive immediately after page load',
    performanceExpectations: {
      maxHydrationTime: 100,
      maxRenderTime: 50,
      maxMemoryUsage: 1024 * 1024 // 1MB
    }
  },
  {
    name: 'client-visible',
    directive: 'visible',
    description: 'Component hydrates when it enters the viewport',
    expectedBehavior: 'Should hydrate when scrolled into view',
    performanceExpectations: {
      maxHydrationTime: 150,
      maxRenderTime: 75,
      maxMemoryUsage: 1024 * 1024
    }
  },
  {
    name: 'client-idle',
    directive: 'idle',
    description: 'Component hydrates when main thread is idle',
    expectedBehavior: 'Should hydrate after page becomes idle',
    performanceExpectations: {
      maxHydrationTime: 200,
      maxRenderTime: 100,
      maxMemoryUsage: 1024 * 1024
    }
  },
  {
    name: 'client-media-mobile',
    directive: 'media',
    mediaQuery: '(max-width: 768px)',
    description: 'Component hydrates only on mobile devices',
    expectedBehavior: 'Should hydrate only when viewport matches media query',
    performanceExpectations: {
      maxHydrationTime: 100,
      maxRenderTime: 50,
      maxMemoryUsage: 512 * 1024 // 512KB for mobile
    }
  },
  {
    name: 'client-media-desktop',
    directive: 'media',
    mediaQuery: '(min-width: 769px)',
    description: 'Component hydrates only on desktop devices',
    expectedBehavior: 'Should hydrate only when viewport matches media query',
    performanceExpectations: {
      maxHydrationTime: 100,
      maxRenderTime: 50,
      maxMemoryUsage: 1024 * 1024
    }
  },
  {
    name: 'client-only',
    directive: 'only',
    framework: 'react',
    description: 'Component renders only on client, no SSR',
    expectedBehavior: 'Should not render during SSR, only on client',
    performanceExpectations: {
      maxHydrationTime: 150,
      maxRenderTime: 100,
      maxMemoryUsage: 1024 * 1024
    }
  }
];

export interface ComponentTestConfig {
  component: 'UserButton' | 'SignIn' | 'SignUp' | 'AccountSettings' | 'StackProvider';
  scenarios: string[]; // scenario names from hydrationScenarios
  props?: Record<string, any>;
  expectedElements: string[]; // CSS selectors or test IDs
  interactions?: {
    type: 'click' | 'input' | 'scroll' | 'hover';
    target: string; // CSS selector
    value?: string;
    expectedResult: string;
  }[];
}

export const componentTestConfigs: ComponentTestConfig[] = [
  {
    component: 'UserButton',
    scenarios: ['client-load', 'client-visible', 'client-idle', 'client-media-mobile'],
    expectedElements: ['[data-testid="test-user-button"]', '.test-wrapper'],
    interactions: [
      {
        type: 'click',
        target: '[data-testid="test-user-button"] button',
        expectedResult: 'User menu should open'
      }
    ]
  },
  {
    component: 'SignIn',
    scenarios: ['client-load', 'client-visible', 'client-idle', 'client-only'],
    expectedElements: ['[data-testid="test-sign-in"]', '[data-testid="hydration-tracker"]'],
    interactions: [
      {
        type: 'input',
        target: 'input[type="email"]',
        value: 'test@example.com',
        expectedResult: 'Email input should accept value'
      },
      {
        type: 'click',
        target: 'button[type="submit"]',
        expectedResult: 'Sign in form should submit'
      }
    ]
  },
  {
    component: 'SignUp',
    scenarios: ['client-load', 'client-idle', 'client-media-desktop'],
    expectedElements: ['form', 'input[type="email"]', 'input[type="password"]'],
    interactions: [
      {
        type: 'input',
        target: 'input[type="email"]',
        value: 'test@example.com',
        expectedResult: 'Email input should accept value'
      }
    ]
  },
  {
    component: 'AccountSettings',
    scenarios: ['client-load', 'client-visible'],
    expectedElements: ['[data-account-settings]'],
    interactions: [
      {
        type: 'click',
        target: '[data-save-button]',
        expectedResult: 'Settings should be saved'
      }
    ]
  },
  {
    component: 'StackProvider',
    scenarios: ['client-load'],
    props: {
      publishableClientKey: 'test-key',
      baseUrl: 'http://localhost:3000'
    },
    expectedElements: ['[data-testid="test-stack-provider"]']
  }
];

export interface AccessibilityTestConfig {
  scenario: string;
  component: string;
  checks: {
    type: 'aria-label' | 'role' | 'tabindex' | 'keyboard-navigation' | 'screen-reader' | 'contrast';
    target?: string;
    expected?: string | number;
    description: string;
  }[];
}

export const accessibilityTestConfigs: AccessibilityTestConfig[] = [
  {
    scenario: 'client-load',
    component: 'UserButton',
    checks: [
      {
        type: 'aria-label',
        target: 'button',
        expected: 'User menu',
        description: 'User button should have accessible label'
      },
      {
        type: 'role',
        target: 'button',
        expected: 'button',
        description: 'User button should have correct role'
      },
      {
        type: 'keyboard-navigation',
        description: 'User button should be keyboard accessible'
      }
    ]
  },
  {
    scenario: 'client-load',
    component: 'SignIn',
    checks: [
      {
        type: 'aria-label',
        target: 'form',
        expected: 'Sign in form',
        description: 'Sign in form should have accessible label'
      },
      {
        type: 'role',
        target: 'input[type="email"]',
        expected: 'textbox',
        description: 'Email input should have correct role'
      },
      {
        type: 'tabindex',
        target: 'input',
        expected: 0,
        description: 'Form inputs should be in tab order'
      }
    ]
  }
];

export interface PerformanceTestConfig {
  scenario: string;
  component: string;
  metrics: {
    name: 'hydration-time' | 'render-time' | 'memory-usage' | 'bundle-size' | 'interaction-response';
    threshold: number;
    unit: 'ms' | 'kb' | 'mb' | '%';
    description: string;
  }[];
}

export const performanceTestConfigs: PerformanceTestConfig[] = [
  {
    scenario: 'client-load',
    component: 'UserButton',
    metrics: [
      {
        name: 'hydration-time',
        threshold: 100,
        unit: 'ms',
        description: 'UserButton should hydrate within 100ms'
      },
      {
        name: 'render-time',
        threshold: 50,
        unit: 'ms',
        description: 'UserButton should render within 50ms'
      },
      {
        name: 'interaction-response',
        threshold: 16,
        unit: 'ms',
        description: 'UserButton clicks should respond within 16ms (60fps)'
      }
    ]
  },
  {
    scenario: 'client-visible',
    component: 'SignIn',
    metrics: [
      {
        name: 'hydration-time',
        threshold: 150,
        unit: 'ms',
        description: 'SignIn should hydrate within 150ms when visible'
      },
      {
        name: 'memory-usage',
        threshold: 1,
        unit: 'mb',
        description: 'SignIn should use less than 1MB memory'
      }
    ]
  }
];

/**
 * Test suite configuration combining all test types
 */
export interface TestSuiteConfig {
  name: string;
  hydration: HydrationScenario;
  components: ComponentTestConfig[];
  accessibility: AccessibilityTestConfig[];
  performance: PerformanceTestConfig[];
  visualRegression?: {
    baseline: string;
    threshold: number;
  };
}

export const testSuites: TestSuiteConfig[] = hydrationScenarios.map(scenario => ({
  name: `${scenario.name}-suite`,
  hydration: scenario,
  components: componentTestConfigs.filter(config => 
    config.scenarios.includes(scenario.name)
  ),
  accessibility: accessibilityTestConfigs.filter(config => 
    config.scenario === scenario.name
  ),
  performance: performanceTestConfigs.filter(config => 
    config.scenario === scenario.name
  ),
  visualRegression: {
    baseline: `screenshots/${scenario.name}`,
    threshold: 0.02 // 2% pixel difference threshold
  }
}));

export default {
  hydrationScenarios,
  componentTestConfigs,
  accessibilityTestConfigs,
  performanceTestConfigs,
  testSuites
};