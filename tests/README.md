# Tests

Quick reference for running tests. For comprehensive testing documentation, see **[docs/TESTING.md](../docs/TESTING.md)**.

## Quick Start

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open test UI
npm run test:ui
```

## Structure

```
tests/
├── unit/                    # Unit tests for services and business logic
│   ├── middleware/         # Middleware tests
│   └── services/           # Service layer tests
├── integration/            # E2E integration tests
├── helpers/               # Test utilities and mocks
│   ├── mocks.ts          # Mock data factories
│   └── auto-mocks.ts     # Automatic mocking utilities
├── setup.ts              # Global test setup
├── tsconfig.json         # TypeScript config for tests
└── README.md            # This file
```

## Full Documentation

For complete testing guide including:
- Writing unit and integration tests
- Mock utilities and patterns
- Test configuration deep-dive
- Best practices and common patterns
- Troubleshooting

**See [docs/TESTING.md](../docs/TESTING.md)**
