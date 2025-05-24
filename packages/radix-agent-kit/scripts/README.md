# Radix Agent Kit Scripts

This directory contains utility scripts for the Radix Agent Kit project.

## Available Scripts

### `check-tests.js`

Checks if the test environment is set up correctly. It verifies:

- Jest configuration exists
- Test files are present
- Jest is installed

**Usage:**

```bash
npm run test:check
# or
node scripts/check-tests.js
```

### `install-test-deps.sh`

Installs all dependencies required for testing:

- jest
- ts-jest
- @jest/globals
- @types/jest

**Usage:**

```bash
npm run test:setup
# or
bash scripts/install-test-deps.sh
```

## Adding New Scripts

When adding new scripts:

1. Create the script file in this directory
2. Make it executable with `chmod +x scriptname.sh` for shell scripts
3. Add an entry to package.json in the scripts section
4. Update this README with information about the script

## Best Practices

- Include helpful error messages and status updates in scripts
- Use colors for console output where appropriate
- Make scripts work from any directory when possible
- Include usage examples in script comments 