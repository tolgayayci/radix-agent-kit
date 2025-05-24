#!/bin/bash

# Script to install testing dependencies for Radix Agent Kit

set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Installing test dependencies for Radix Agent Kit...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${YELLOW}Warning: package.json not found in current directory.${NC}"
  echo -e "${YELLOW}Make sure you run this script from the packages/radix-agent-kit directory.${NC}"
  echo -e "${YELLOW}Attempting to find and navigate to the right directory...${NC}"
  
  # Try to find the right directory
  if [ -d "packages/radix-agent-kit" ]; then
    cd packages/radix-agent-kit
    echo -e "${GREEN}Found and navigated to packages/radix-agent-kit${NC}"
  else
    echo -e "${YELLOW}Cannot find packages/radix-agent-kit. Continuing anyway...${NC}"
  fi
fi

# Install dependencies with npm
echo -e "${CYAN}Installing Jest and related packages...${NC}"
npm install --save-dev \
  jest \
  ts-jest \
  @jest/globals \
  @types/jest

# Check if installation was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Successfully installed test dependencies!${NC}"
else
  echo -e "${YELLOW}⚠ There were issues installing dependencies. See errors above.${NC}"
fi

# Create test directory if it doesn't exist
if [ ! -d "tests" ]; then
  echo -e "${CYAN}Creating tests directory...${NC}"
  mkdir -p tests
  echo -e "${GREEN}✓ Created tests directory${NC}"
fi

echo -e "\n${GREEN}Dependencies installed!${NC}"
echo -e "${CYAN}You can now run tests with:${NC}"
echo -e "  npm test             # Run all tests"
echo -e "  npm run test:watch   # Run tests in watch mode"
echo -e "  npm run test:coverage # Run tests with coverage"
echo -e "  npm run test:check   # Check test setup"

# Make the script executable
chmod +x scripts/check-tests.js 