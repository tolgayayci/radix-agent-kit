#!/usr/bin/env node

/**
 * This script checks if the test environment is set up correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}Checking test environment setup...${colors.reset}\n`);

// Check if Jest config exists
const jestConfigPath = path.resolve(__dirname, '..', 'jest.config.js');
if (fs.existsSync(jestConfigPath)) {
  console.log(`${colors.green}✓ Jest config found${colors.reset}`);
} else {
  console.log(`${colors.red}✗ Jest config not found${colors.reset}`);
}

// Check if test files exist
const testDir = path.resolve(__dirname, '..', 'tests');
if (fs.existsSync(testDir)) {
  const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));
  if (testFiles.length > 0) {
    console.log(`${colors.green}✓ ${testFiles.length} test files found${colors.reset}`);
    testFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  } else {
    console.log(`${colors.yellow}! No test files found${colors.reset}`);
  }
} else {
  console.log(`${colors.red}✗ Test directory not found${colors.reset}`);
}

// Check if Jest is installed
try {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  if (packageJson.devDependencies && packageJson.devDependencies.jest) {
    console.log(`${colors.green}✓ Jest is installed (${packageJson.devDependencies.jest})${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Jest is not installed${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}✗ Error reading package.json: ${error.message}${colors.reset}`);
}

// Check Node.js version
const nodeVersion = process.version;
console.log(`${colors.cyan}Node.js version: ${nodeVersion}${colors.reset}`);

console.log(`\n${colors.cyan}To run tests, use:${colors.reset}`);
console.log(`  npm test             # Run all tests`);
console.log(`  npm run test:watch   # Run tests in watch mode`);
console.log(`  npm run test:coverage # Run tests with coverage report`);

console.log(`\n${colors.cyan}Done!${colors.reset}`); 