# Hono-CLI 🦊

A powerful CLI tool for scaffolding and managing Hono.js projects with production-ready features. Create new projects, generate modules with advanced patterns, and streamline your development workflow with MongoDB integration.

## Features ✨

### Core Features
- Quick project initialization with best practices
- Module generation with CRUD operations
- MongoDB integration out of the box
- Swagger documentation
- Type-safe routes with Hono
- Path aliases for better imports
- Environment configuration
- Developer-friendly CLI interface

### 🆕 v2.0.0 Advanced Features
- **Advanced Query System** - Filter operators (gt, gte, lt, lte, ne, in, nin, regex, exists, between)
- **Soft Delete** - Built-in soft delete support with audit trail
- **Lifecycle Hooks** - beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete
- **Service Context** - Request context management with user info and metadata
- **Transaction Support** - MongoDB transaction support via ServiceContext
- **API Error Handler** - Consistent error responses with ApiError class
- **Bulk Operations** - createMany, updateMany, deleteMany methods
- **Statistics** - Built-in getStats and countDocuments methods
- **Restore Functionality** - Restore soft-deleted items
- **Advanced Aggregation** - Custom pipeline support with pagination
- **Database Seeding** - Built-in seeding system for development and testing

## Installation 🚀

```bash
npm install -g hono-cli
# or
bun install -g hono-cli
```

## Usage 📚

### Create New Project

```bash
hono-cli init my-project
```

This will create a new Hono.js project with the following structure:
```
my-project/
├── src/
│   ├── modules/      # Feature modules
│   ├── shared/       # Shared utilities and middleware
│   │   ├── middleware/
│   │   └── utils/
│   ├── config/      # Configuration files
│   ├── index.ts     # Application entry point
│   └── routes.ts    # Route manager
├── .env             # Environment variables
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

### Generate Module

```bash
hono-cli g:m user
```

This generates a new module with:
- Controller with CRUD operations
- Service layer with MongoDB integration
- Type definitions
- Route configuration with Swagger docs
- Automatic route registration

Generated module structure:
```
src/modules/user/
├── user.controller.ts
├── user.service.ts
├── user.routes.ts
├── user.types.ts
├── user.validation.ts
├── user.seed.ts        # 🆕 Seeder for development data
└── index.ts
```

### Generate Router Only

```bash
hono-cli g:r user
```

This generates a minimal module with just routing functionality:
```
src/modules/user/
├── user.routes.ts
└── index.ts
```

The router generator:
- Creates only routing-related files
- Automatically registers routes in the route manager
- Perfect for simple API endpoints without complex business logic

### Version Check

```bash
hono-cli version
# or
hono-cli v
```

Shows detailed package information:
- Current package version
- List of installed dependencies and their versions
- List of development dependencies and their versions

## Configuration 🛠

### Database

Database configuration is located in `src/config/db.config.ts`:
```typescript
export const dbConfig = {
  development: {
        url: process.env.DB_URL || 'mongodb://localhost:27017',
        name: process.env.DB_NAME || 'hono_dev'
    },
  test: {
        url: process.env.TEST_DB_URL || 'mongodb://localhost:27017',
        name: process.env.TEST_DB_NAME || 'hono_test',
        options: {
            maxPoolSize: 5,
            minPoolSize: 1
        }
    },
    production: {
        url: process.env.PROD_DB_URL || 'mongodb://localhost:27017',
        name: process.env.PROD_DB_NAME || 'hono_prod',
        options: {
            maxPoolSize: 20,
            minPoolSize: 10,
            retryWrites: true,
            retryReads: true
        }
    }
}
```

### Environment Variables

Available environment variables:
```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_URL=mongodb://localhost:27017
DB_NAME=hono_dev

# Production Database
PROD_DB_URL=mongodb://your-production-url:27017
PROD_DB_NAME=hono_prod
```

## Commands Reference 📖

| Command | Description |
|---------|-------------|
| `hono-cli init <name>` | Create new Hono.js project |
| `hono-cli g:m <name>` | Generate new module with CRUD |
| `hono-cli g:r <name>` | Generate router only |
| `hono-cli version` or `hono-cli v` | Show version info |

## Database Seeding 🌱

The CLI provides a powerful seeding system to populate your database with development or test data.

### Overview

When you generate a module with `hono-cli g:m <name>`, a seed file is automatically created at `src/modules/<name>/<name>.seed.ts`. This file contains a seeder class that you can customize with your seed data.

The seeding system runs within your project (not from the CLI) to properly handle TypeScript and your project's imports.

### Seed File Structure

```typescript
import { userService } from './user.service'
import type { UserInput } from './user.types'

export class UserSeeder {
    private seededIds: string[] = []

    constructor(private service: typeof userService) {}

    async seed(): Promise<string[]> {
        console.log('🌱 Seeding user...')

        const data: UserInput[] = [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Smith', email: 'jane@example.com' },
        ]

        const items = await this.service.createMany(data, {})
        this.seededIds = items.map((item) => item._id.toString())

        console.log(`✅ Seeded ${items.length} user(s)`)
        return this.seededIds
    }

    async unseed(): Promise<void> {
        console.log('🗑️  Unseeding user...')

        if (this.seededIds.length === 0) {
            console.log('⚠️  No seeded IDs to unseed for user')
            return
        }

        await this.service.deleteMany(
            { _id: { $in: this.seededIds } },
            {}
        )

        console.log(`✅ Unseeded ${this.seededIds.length} user(s)`)
        this.seededIds = []
    }
}
```

### Seeding Commands

All seed commands are run from within your project using the `bun seed` script:

#### Seed a Specific Module

```bash
bun seed seed user
```

This will execute the `seed()` method of the UserSeeder class and populate the database with the defined data.

#### Unseed a Specific Module

```bash
bun seed unseed user
```

This will remove all data that was seeded by the UserSeeder.

#### Seed All Modules

```bash
bun seed seed:all
```

Automatically discovers and runs all seeders in your `src/modules/` directory.

#### Unseed All Modules

```bash
bun seed unseed:all
```

Removes all seeded data from all modules (in reverse order).

#### Refresh Seeds

```bash
# Refresh a specific module
bun seed seed:refresh user

# Refresh all modules
bun seed seed:refresh
```

This will unseed and then seed again, useful when you've updated your seed data.

#### Check Available Seeders

```bash
bun seed seed:status
```

Shows all available seeders in your project.

### Customizing Seed Data

Edit the `data` array in your seed file to add your custom seed data:

```typescript
async seed(): Promise<string[]> {
    const data: UserInput[] = [
        {
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
        },
        {
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
        },
        // Add more seed data here
    ]

    const items = await this.service.createMany(data, {})
    this.seededIds = items.map((item) => item._id.toString())

    console.log(`✅ Seeded ${items.length} user(s)`)
    return this.seededIds
}
```

### Best Practices for Seeding

1. **Use Realistic Data**: Seed data should resemble production data for better testing
2. **Track Seeded IDs**: The seeder automatically tracks IDs for proper cleanup
3. **Seed in Order**: If modules have dependencies, seed in the correct order
4. **Clean Up**: Always unseed before re-seeding to avoid duplicates
5. **Development Only**: Seeders are for development/testing, not production

## Advanced Query Features 🔍

### Filter Operators

```bash
# Greater than / Less than
GET /users?age__gte=18&age__lte=65

# Not equal
GET /users?status__ne=inactive

# In / Not in
GET /users?role__in=admin,moderator
GET /users?role__nin=guest,banned

# Regex pattern matching
GET /users?name__regex=john

# Exists check
GET /users?deletedAt__exists=false

# Between range
GET /users?createdAt__between=2024-01-01,2024-12-31
```

### Array Size Operators

```bash
# Array size greater than
GET /users?posts__size_gt=10

# Array size in range
GET /users?posts__size_between=5,20
```

### Pagination & Sorting

```bash
# Pagination
GET /users?page=1&limit=10

# Sort by multiple fields
GET /users?sort=name:asc,createdAt:desc

# Search
GET /users?search=john&searchFields=name,email
```

### Field Projection

```bash
# Include specific fields only
GET /users?include=name,email

# Exclude fields
GET /users?exclude=password,internal
```

## Project Structure 🏗

```
src/
├── modules/              # Feature modules
│   └── user/            # Example module
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.routes.ts
│       ├── user.types.ts
│       ├── user.validation.ts
│       └── index.ts
├── shared/
│   ├── controller/      # Base controller with createController
│   │   ├── index.ts
│   │   └── types.ts
│   ├── service/         # BaseService with advanced features
│   │   ├── index.ts
│   │   └── types.ts
│   ├── query/           # 🆕 QueryParser for filtering
│   │   ├── index.ts
│   │   └── types.ts
│   ├── errors/          # 🆕 ApiError handler
│   │   └── index.ts
│   ├── aggregate/       # 🆕 Aggregation types
│   │   └── types.ts
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── pagination/      # Pagination helpers
├── config/              # Configuration files
│   ├── db.config.ts
│   └── collections.config.ts
├── index.ts             # Application entry
└── routes.ts            # Route manager
```

## Best Practices 💡

1. **Module Organization**:
   - Keep related functionality together
   - Use clear naming conventions
   - Separate concerns (controller, service, routes)

2. **Database Handling**:
   - Use services for database operations
   - Implement proper error handling
   - Follow MongoDB best practices

3. **Type Safety**:
   - Define clear interfaces
   - Use TypeScript features
   - Validate API inputs

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

MIT © [Alex Veros](mailto:alexveros46@mail.com)

## Author ✨

**Alex Veros**
- Email: alexveros46@mail.com
- GitHub: [@Jorlex27](https://github.com/Jorlex27)