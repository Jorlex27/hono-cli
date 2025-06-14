export const dbConfig = `interface DatabaseConfig {
    url: string;
    name: string;
    options?: {
        maxPoolSize?: number;
        minPoolSize?: number;
        retryWrites?: boolean;
        retryReads?: boolean;
    };
}

interface Config {
    development: DatabaseConfig;
    test: DatabaseConfig;
    production: DatabaseConfig;
}

export const dbConfig: Config = {
    development: {
        url: process.env.DB_URL || 'mongodb://localhost:27017',
        name: process.env.DB_NAME || 'hono_dev',
        options: {
            maxPoolSize: 10,
            minPoolSize: 5,
            retryWrites: true,
            retryReads: true
        }
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
}`