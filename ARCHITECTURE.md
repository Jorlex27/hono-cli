# Hono CLI - Architecture Documentation

## Overview

This CLI tool helps developers quickly scaffold and generate Hono.js projects with a well-organized structure. The codebase has been refactored to follow clean architecture principles with clear separation of concerns.

## Project Structure

```
src/
├── cli.ts                      # Main entry point - defines CLI commands
├── commands/                   # Command handlers
│   ├── init.command.ts        # Handle project initialization
│   ├── generate.command.ts    # Handle module/router generation
│   ├── version.command.ts     # Handle version display
│   └── index.ts               # Export all commands
├── core/                       # Core business logic
│   ├── generators/            # Code generators
│   │   ├── project.generator.ts
│   │   ├── module.generator.ts
│   │   └── router.generator.ts
│   └── managers/              # Resource managers
│       ├── route.manager.ts   # Manages route registration
│       └── collection.manager.ts # Manages collection config
├── templates/                  # Code generation templates
│   ├── project.template.ts    # Project scaffolding templates
│   └── module.template.ts     # Module file templates
├── config/                     # Configuration
│   ├── constants.ts           # Application constants
│   └── templates/             # Config file templates
│       ├── controller/
│       ├── service/
│       ├── pagination/
│       ├── db.config.ts
│       ├── db.utils.ts
│       ├── ts.config.ts
│       └── env.ts
├── utils/                      # Utility functions
│   ├── file.util.ts           # File system operations
│   ├── text.util.ts           # String case conversions
│   ├── validation.util.ts     # Input validation
│   └── errors.util.ts         # Error handling
└── types/                      # TypeScript type definitions
    └── index.ts
```

## Architecture Principles

### 1. Separation of Concerns

- **Commands**: Handle CLI input and orchestrate operations
- **Core**: Contains business logic (generators and managers)
- **Templates**: Define code structure for generated files
- **Utils**: Provide reusable utility functions
- **Config**: Centralize configuration and constants

### 2. Single Responsibility

Each module has a single, well-defined purpose:

- `module.generator.ts` - Generates complete modules
- `router.generator.ts` - Generates standalone routers
- `route.manager.ts` - Manages route registration
- `collection.manager.ts` - Manages collection configuration

### 3. Error Handling

Custom error classes provide clear, specific error messages:

```typescript
- CLIError - Base error class
- ProjectExistsError - Project already exists
- ModuleExistsError - Module already exists
- FileNotFoundError - File not found
- InvalidNameError - Invalid name format
```

### 4. Type Safety

All types are centralized in `src/types/index.ts`:

```typescript
- ModuleFile - Module file definition
- ProjectConfig - Project configuration
- GeneratorOptions - Generator options
- PackageJson - Package.json structure
```

## Key Features

### Constants Management

All magic strings and configuration values are in `config/constants.ts`:

- CLI version and name
- Directory paths
- File names
- Dependencies
- Success/error messages

### Text Utilities

`utils/text.util.ts` provides comprehensive text transformation:

- `toCamelCase()` - Convert to camelCase
- `toPascalCase()` - Convert to PascalCase
- `toKebabCase()` - Convert to kebab-case
- `toSnakeCase()` - Convert to snake_case
- `toConstantCase()` - Convert to CONSTANT_CASE
- `pluralize()` - Smart pluralization
- `generateCaseVariations()` - Generate all case variations at once

### Validation

Input validation ensures data integrity:

- Name validation (letters, numbers, hyphens, underscores)
- Path validation (prevent traversal attacks)

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
@/* - src/*
@config/* - src/config/*
@utils/* - src/utils/*
@core/* - src/core/*
@commands/* - src/commands/*
@templates/* - src/templates/*
```

## Commands

### Initialize Project

```bash
hono-cli init <projectName>
```

Creates a new Hono.js project with:
- Bun runtime setup
- MongoDB integration
- TypeScript configuration
- Swagger UI documentation
- Base structure (modules, shared, config)

### Generate Module

```bash
hono-cli g:m <name>
```

Generates a complete module with:
- Types definition
- Validation schema (Zod)
- Controller
- Service
- Routes
- Automatic route registration

### Generate Router

```bash
hono-cli g:r <name>
```

Generates a standalone router without the full module structure.

### Check Version

```bash
hono-cli version
# or
hono-cli v
```

Displays package version and dependencies.

## Development Guidelines

### Adding New Commands

1. Create command handler in `src/commands/`
2. Create generator in `src/core/generators/` if needed
3. Add command to `src/cli.ts`
4. Export from `src/commands/index.ts`

### Adding New Templates

1. Create template function in `src/templates/`
2. Use consistent naming: `generate<Name>Template()`
3. Return string containing the file content

### Error Handling

Always use the error handling utilities:

```typescript
import { handleError } from '@utils/errors.util'

try {
  // Your code
} catch (error) {
  handleError(error, 'Context message')
}
```

### Text Transformations

Use the centralized text utilities:

```typescript
import { generateCaseVariations } from '@utils/text.util'

const { kebab, pascal, camel, upper } = generateCaseVariations(name)
```

## Testing

Build the CLI:

```bash
bun run build
```

Test commands:

```bash
node dist/cli.js --help
node dist/cli.js init test-project
```

## Benefits of Refactoring

1. **Better Organization**: Clear folder structure with logical grouping
2. **Easier Maintenance**: Each file has a single responsibility
3. **Improved Testability**: Modular design makes unit testing easier
4. **Consistent Patterns**: Standardized error handling and utilities
5. **Type Safety**: Comprehensive TypeScript types
6. **Scalability**: Easy to add new commands and features
7. **Code Reusability**: Shared utilities and managers
8. **Clear Imports**: Path aliases make imports cleaner

## Migration Notes

Old structure → New structure:

- `helpers/` → Merged into `utils/`
- `generators/config/` → Moved to `config/templates/`
- `generators/*.generator.ts` → Moved to `core/generators/`
- Command logic in `cli.ts` → Extracted to `commands/`
- Route/collection utilities → Moved to `core/managers/`

All functionality has been preserved during the refactoring.
