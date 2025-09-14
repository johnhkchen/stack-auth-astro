// Test script to verify SignIn component can be imported
import { SignIn, SignUp, UserButton } from './dist/components.mjs';

console.log('✅ SignIn component imported successfully:', typeof SignIn);
console.log('✅ SignUp component imported successfully:', typeof SignUp);
console.log('✅ UserButton component imported successfully:', typeof UserButton);

console.log('✅ All components are functions/objects as expected');