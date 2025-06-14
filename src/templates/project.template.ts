export const generateIndexTs = (name: string) => `
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { setupRoutes } from './routes'
import { db } from '@shared/utils/db.util'

const app = new Hono()
        
// Middleware
app.use('/*', cors())
app.get('/ui', swaggerUI({ url: '/doc' }))

// Initialize database connection
db.connect()
    .then(() => console.log('📦 Database connected successfully'))
    .catch(error => {
        console.error('❌ Database connection error:', error)
        process.exit(1)
    })

// Setup routes
setupRoutes(app)

// Handle shutdown
const shutdown = async () => {
    console.log('🛑 Shutting down server...')
    await db.disconnect()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const port = process.env.PORT || 3000
console.log(\`🦊 Server is running at http://localhost:\${port}\`)
console.log(\`📚 Swagger documentation at http://localhost:\${port}/ui\`)

export default {
    port,
    fetch: app.fetch
}`

export const generateRouteManagerTemplate = () => `import { Hono } from 'hono'

// Auto-generated route imports

export const setupRoutes = (app: Hono) => {
  // Auto-generated route registrations
  
  return app
}
`