/**
 * Example Component Tests - Demonstrating jsdom Environment
 * 
 * This test file demonstrates how to test React components and DOM functionality
 * in the jsdom environment. Tests in this file will automatically use jsdom
 * based on the environmentMatchGlobs configuration.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';

// Example React component for testing
function TestComponent({ title, onClick }: { title: string; onClick?: () => void }) {
  return (
    <div data-testid="test-component">
      <h1>{title}</h1>
      <button data-testid="test-button" onClick={onClick}>
        Click me
      </button>
    </div>
  );
}

// Simple counter component for testing state
function CounterComponent() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div data-testid="counter-component">
      <span data-testid="count-display">Count: {count}</span>
      <button 
        data-testid="increment-button" 
        onClick={() => setCount(c => c + 1)}
      >
        Increment
      </button>
      <button 
        data-testid="reset-button" 
        onClick={() => setCount(0)}
      >
        Reset
      </button>
    </div>
  );
}

describe('Component Testing with jsdom', () => {
  it('should have DOM globals available', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(typeof HTMLElement).toBe('function');
  });

  it('should be able to create DOM elements', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello, jsdom!';
    
    expect(div).toBeDefined();
    expect(div.textContent).toBe('Hello, jsdom!');
    expect(div.tagName).toBe('DIV');
  });

  it('should provide DOM manipulation capabilities', () => {
    const container = __TEST_UTILS__.dom.createContainer();
    
    // Create and append an element
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Test paragraph';
    paragraph.setAttribute('data-testid', 'test-paragraph');
    container.appendChild(paragraph);
    
    // Verify the element is in the DOM
    const foundElement = document.querySelector('[data-testid="test-paragraph"]');
    expect(foundElement).toBe(paragraph);
    expect(foundElement?.textContent).toBe('Test paragraph');
    
    // Test DOM expectations
    expect(() => __TEST_UTILS__.dom.expect.elementToBeInDocument(foundElement)).not.toThrow();
    expect(() => __TEST_UTILS__.dom.expect.elementToHaveTextContent(foundElement, 'Test paragraph')).not.toThrow();
  });

  it('should support event simulation', () => {
    const container = __TEST_UTILS__.dom.createContainer();
    let clickCalled = false;
    
    // Create a button with click handler
    const button = document.createElement('button');
    button.textContent = 'Test Button';
    button.addEventListener('click', () => {
      clickCalled = true;
    });
    container.appendChild(button);
    
    // Simulate click
    __TEST_UTILS__.dom.simulate.click(button);
    
    expect(clickCalled).toBe(true);
  });

  it('should support input value changes', () => {
    const container = __TEST_UTILS__.dom.createContainer();
    let changeCalled = false;
    let inputValue = '';
    
    // Create an input with change handler
    const input = document.createElement('input');
    input.type = 'text';
    input.addEventListener('change', (e) => {
      changeCalled = true;
      inputValue = (e.target as HTMLInputElement).value;
    });
    container.appendChild(input);
    
    // Simulate input change
    __TEST_UTILS__.dom.simulate.change(input, 'test value');
    
    expect(changeCalled).toBe(true);
    expect(inputValue).toBe('test value');
    expect(input.value).toBe('test value');
  });

  describe('React Component Rendering (Manual)', () => {
    it('should be able to create React elements', () => {
      // Test React element creation
      const element = React.createElement(TestComponent, { title: 'Test Title' });
      
      expect(element).toBeDefined();
      expect(element.type).toBe(TestComponent);
      expect(element.props.title).toBe('Test Title');
    });

    it('should be able to test component props', () => {
      const props = { title: 'Hello World', onClick: () => {} };
      const element = React.createElement(TestComponent, props);
      
      expect(element.props.title).toBe('Hello World');
      expect(typeof element.props.onClick).toBe('function');
    });

    // Note: Full React component rendering would require additional setup
    // with React Testing Library or similar. This demonstrates the basic
    // DOM environment is working and ready for such tools.
  });

  describe('Browser API Mocks', () => {
    it('should have ResizeObserver mock available', () => {
      expect(typeof ResizeObserver).toBe('function');
      
      const observer = new ResizeObserver(() => {});
      expect(observer).toBeInstanceOf(ResizeObserver);
      
      // These should not throw
      observer.observe(document.body);
      observer.unobserve(document.body);
      observer.disconnect();
    });

    it('should have IntersectionObserver mock available', () => {
      expect(typeof IntersectionObserver).toBe('function');
      
      const observer = new IntersectionObserver(() => {});
      expect(observer).toBeInstanceOf(IntersectionObserver);
      
      // These should not throw
      observer.observe(document.body);
      observer.unobserve(document.body);
      observer.disconnect();
    });
  });

  describe('Stack Auth Component Context', () => {
    it('should be able to mock Stack Auth components', () => {
      // Test that our Stack Auth mocks work in DOM environment
      // Using our custom mocks from the test setup instead of direct imports
      const stackAuthMocks = {
        SignIn: () => React.createElement('div', { 'data-testid': 'sign-in' }, 'SignIn Mock'),
        UserButton: () => React.createElement('div', { 'data-testid': 'user-button' }, 'UserButton Mock'),
        StackProvider: ({ children }: { children: React.ReactNode }) => 
          React.createElement('div', { 'data-testid': 'stack-provider' }, children)
      };
      
      expect(typeof stackAuthMocks.SignIn).toBe('function');
      expect(typeof stackAuthMocks.UserButton).toBe('function');
      expect(typeof stackAuthMocks.StackProvider).toBe('function');
      
      // Create React elements with Stack Auth components
      const signInElement = React.createElement(stackAuthMocks.SignIn);
      const userButtonElement = React.createElement(stackAuthMocks.UserButton);
      const providerElement = React.createElement(stackAuthMocks.StackProvider, {
        children: 'test content'
      });
      
      expect(signInElement).toBeDefined();
      expect(userButtonElement).toBeDefined();
      expect(providerElement).toBeDefined();
    });
  });

  describe('Environment Detection', () => {
    it('should correctly identify jsdom environment', () => {
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
      expect(typeof navigator).toBe('object');
      expect(typeof location).toBe('object');
      
      // jsdom-specific checks - user agent should contain jsdom
      expect(navigator.userAgent).toContain('jsdom');
      
      // Verify we're in a test environment with DOM APIs
      expect(window.location.hostname).toBe('localhost');
    });

    it('should have proper DOM tree structure', () => {
      expect(document.documentElement).toBeDefined();
      expect(document.head).toBeDefined();
      expect(document.body).toBeDefined();
      
      expect(document.documentElement.tagName).toBe('HTML');
      expect(document.head.tagName).toBe('HEAD');
      expect(document.body.tagName).toBe('BODY');
    });
  });
});

describe('Integration Testing Utilities', () => {
  it('should clean up DOM between tests', () => {
    // Create some DOM elements
    const container1 = __TEST_UTILS__.dom.createContainer();
    container1.innerHTML = '<p>Test content 1</p>';
    
    expect(document.querySelectorAll('[data-testid="test-container"]')).toHaveLength(1);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('should start with clean DOM', () => {
    // This test verifies that the previous test's DOM was cleaned up
    expect(document.body.children.length).toBe(0);
    expect(document.querySelectorAll('[data-testid="test-container"]')).toHaveLength(0);
  });

  it('should handle multiple containers', () => {
    const container1 = __TEST_UTILS__.dom.createContainer();
    const container2 = __TEST_UTILS__.dom.createContainer();
    
    container1.innerHTML = '<span>Container 1</span>';
    container2.innerHTML = '<span>Container 2</span>';
    
    expect(document.querySelectorAll('[data-testid="test-container"]')).toHaveLength(2);
    expect(document.body.children.length).toBe(2);
  });
});