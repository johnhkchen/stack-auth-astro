// Simple test to verify Stack Auth components can be imported

async function testImports() {
  try {
    console.log('Testing Stack Auth imports...');
    
    // Try importing the main package
    const stack = await import('@stackframe/stack');
    console.log('✅ @stackframe/stack imported successfully');
    console.log('Available exports:', Object.keys(stack).slice(0, 10).join(', ') + '...');
    
    // Check for specific components
    const { SignIn, SignUp, UserButton, AccountSettings, StackProvider } = stack;
  
  if (SignIn) console.log('✅ SignIn component found');
  else console.log('❌ SignIn component missing');
  
  if (SignUp) console.log('✅ SignUp component found');
  else console.log('❌ SignUp component missing');
  
  if (UserButton) console.log('✅ UserButton component found');
  else console.log('❌ UserButton component missing');
  
  if (AccountSettings) console.log('✅ AccountSettings component found');
  else console.log('❌ AccountSettings component missing');
  
  if (StackProvider) console.log('✅ StackProvider component found');
  else console.log('❌ StackProvider component missing');
  
  console.log('\n📋 Component test summary:');
  console.log(`SignIn: ${SignIn ? 'Available' : 'Missing'}`);
  console.log(`SignUp: ${SignUp ? 'Available' : 'Missing'}`);
  console.log(`UserButton: ${UserButton ? 'Available' : 'Missing'}`);
  console.log(`AccountSettings: ${AccountSettings ? 'Available' : 'Missing'}`);
  console.log(`StackProvider: ${StackProvider ? 'Available' : 'Missing'}`);
  
  } catch (error) {
    console.error('❌ Stack Auth import failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testImports();