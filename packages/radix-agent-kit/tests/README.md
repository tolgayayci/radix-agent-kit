# Radix Agent Kit Tests

This directory contains tests for the Radix Agent Kit project.

## Test Structure

- **Unit Tests**: Test individual components in isolation
  - `RadixMnemonicWallet.test.ts`: Tests for mnemonic wallet implementation
  - `RadixGatewayClient.test.ts`: Tests for Radix Gateway API client
  - `RadixTransactionBuilder.test.ts`: Tests for transaction building functionality

- **Integration Tests**: Tests combining multiple components
  - `integration/RadixIntegration.test.ts`: End-to-end tests for wallet + gateway + transactions

## Running Tests

From the `packages/radix-agent-kit` directory:

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Check test environment setup
npm run test:check
```

## Test Environment

Tests are configured to run against Stokenet (testnet) by default for safety. The test timeout is set to 30 seconds to accommodate network operations.

## Test Utilities

- `setup.ts`: Global Jest setup file with before/after hooks

## Adding New Tests

1. Create a new file with `.test.ts` extension in this directory
2. Import test utilities from Jest: `import { describe, expect, test } from '@jest/globals'`
3. Write your tests following the existing patterns

## Best Practices

- Keep unit tests fast and focused on one component
- Use mocks for external dependencies in unit tests
- Use descriptive test names that explain what is being tested
- Group related tests in describe blocks
- Avoid testing implementation details, focus on behavior

## Mocking

For tests that need to mock the Radix Gateway API or other external dependencies, create mock implementations in a `__mocks__` directory.

## Code Coverage

Run `npm run test:coverage` to generate a coverage report. The report will be available in the `coverage` directory. 