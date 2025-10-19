export const dbUtil = `import { MongoClient, Db } from 'mongodb'
import { dbConfig } from '@config/db.config'

class Database {
    private static instance: Database
    private client: MongoClient | null = null
    private db: Db | null = null

    private constructor() {}

    static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database()
        }
        return Database.instance
    }

    async connect(): Promise<void> {
        try {
            const env = process.env.NODE_ENV || 'development'
            const config = dbConfig[env as keyof typeof dbConfig]

            if (!this.client) {
                this.client = new MongoClient(config.url, config.options)
                await this.client.connect()
                this.db = this.client.db(config.name)
                console.log(\`Connected to database: \${config.name}\`)
            }
        } catch (error) {
            console.error('Database connection error:', error)
            throw error
        }
    }

    getDb(): Db {
        if (!this.db) {
            throw new Error('Database not initialized. Call connect() first.')
        }
        return this.db
    }

    async disconnect(): Promise<void> {
        try {
            if (this.client) {
                await this.client.close()
                this.client = null
                this.db = null
                console.log('Database connection closed')
            }
        } catch (error) {
            console.error('Error closing database connection:', error)
            throw error
        }
    }
}

export const db = Database.getInstance()`