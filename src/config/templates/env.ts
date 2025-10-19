export const envTemplate = (projectName: string) => `# Database Configuration
NODE_ENV=development

# Development Database
DB_URL=mongodb://localhost:27017
DB_NAME=${projectName}_dev

# Test Database
TEST_DB_URL=mongodb://localhost:27017
TEST_DB_NAME=${projectName}_test

# Production Database
PROD_DB_URL=mongodb://your-production-url:27017
PROD_DB_NAME=${projectName}_prod`