import { beforeAll, afterAll } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up Radix Agent Kit tests...');
});

afterAll(async () => {
  console.log('✅ Radix Agent Kit tests completed!');
}); 