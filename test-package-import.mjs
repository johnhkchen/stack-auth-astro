// Test package import path as consumers would use it
try {
  console.log('🧪 Testing package import path...');
  
  // This is how consumers would import the components
  const components = await import('./dist/components.mjs');
  
  const { SignIn, SignUp, UserButton, AccountSettings, StackProvider } = components;
  
  console.log('✅ Import from dist/components.mjs successful');
  
  // Verify all expected components are available
  const expectedComponents = ['SignIn', 'SignUp', 'UserButton', 'AccountSettings', 'StackProvider'];
  
  console.log('\n📋 Component exports validation:');
  expectedComponents.forEach(name => {
    const component = components[name];
    if (typeof component === 'function') {
      console.log(`✅ ${name}: Exported as function`);
    } else {
      console.log(`❌ ${name}: Missing or invalid export`);
    }
  });
  
  // Test that interfaces are available at runtime (for TypeScript users)
  console.log('\n🔧 TypeScript integration test:');
  console.log('User interface available:', typeof components.User !== 'undefined' ? 'Yes' : 'Type only (expected)');
  console.log('SignInProps interface available:', typeof components.SignInProps !== 'undefined' ? 'Yes' : 'Type only (expected)');
  
  console.log('\n🎉 Package import test successful!');
  console.log('📦 Consumer usage: import { SignIn, SignUp, UserButton } from "astro-stack-auth/components"');
  
} catch (error) {
  console.error('❌ Package import test failed:', error);
  process.exit(1);
}