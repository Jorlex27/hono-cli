export const CLI_VERSION = '2.0.0'

export const CLI_NAME = 'hono-cli'

export const DIRECTORIES = {
  MODULES: 'src/modules',
  SHARED_MIDDLEWARE: 'src/shared/middleware',
  SHARED_UTILS: 'src/shared/utils',
  SHARED_SERVICE: 'src/shared/service',
  SHARED_CONTROLLER: 'src/shared/controller',
  SHARED_PAGINATION: 'src/shared/pagination',
  SHARED_QUERY: 'src/shared/query',
  SHARED_AGGREGATE: 'src/shared/aggregate',
  SHARED_ERRORS: 'src/shared/errors',
  CONFIG: 'src/config',
} as const

export const FILE_NAMES = {
  PACKAGE_JSON: 'package.json',
  TSCONFIG: 'tsconfig.json',
  ENV_EXAMPLE: '.env.example',
  ENV: '.env',
  GITIGNORE: '.gitignore',
  README: 'README.md',
  ROUTES: 'src/routes.ts',
  INDEX: 'src/index.ts',
} as const

export const DEPENDENCIES = {
  PRODUCTION: ['hono', '@hono/swagger-ui', 'zod', 'mongodb'],
  DEVELOPMENT: ['@types/mongodb', '@types/bun'],
} as const

export const FILE_EXTENSIONS = {
  TYPESCRIPT: '.ts',
  JAVASCRIPT: '.js',
  JSON: '.json',
} as const

export const MESSAGES = {
  SUCCESS: {
    PROJECT_INITIALIZED: (name: string) => `✨ Project ${name} initialized successfully!`,
    MODULE_GENERATED: (name: string) => `✨ Module ${name} generated successfully!`,
    ROUTER_GENERATED: (name: string) => `✨ Router ${name} generated successfully!`,
    DEPENDENCIES_INSTALLED: '✨ Dependencies installed successfully!',
  },
  ERROR: {
    PROJECT_EXISTS: (name: string) => `Project ${name} already exists!`,
    MODULE_EXISTS: (name: string) => `Module ${name} already exists!`,
    GENERATION_FAILED: (type: string) => `Error generating ${type}:`,
    INITIALIZATION_FAILED: 'Error initializing project:',
    PACKAGE_JSON_NOT_FOUND: 'Error reading package.json:',
  },
  INFO: {
    INITIALIZING_PROJECT: 'Initializing Bun project...',
    INSTALLING_DEPENDENCIES: 'Installing dependencies...',
    UPDATING_COLLECTIONS: 'Updating collections configuration...',
    UPDATING_ROUTE_MANAGER: (name: string) => `Updated routes manager with ${name} module`,
  },
} as const
