export const errorsIndexTemplate = `
import { Context } from "hono"
import { ZodError } from "zod"

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'ApiError'
    }

    static badRequest(message: string = 'Bad request', details?: any): ApiError {
        return new ApiError(400, message, details)
    }

    static unauthorized(message: string = 'Unauthorized'): ApiError {
        return new ApiError(401, message)
    }

    static accessDenied(resource: string = 'this resource'): ApiError {
        return new ApiError(403, \`Access denied to \${resource}\`)
    }

    static notFound(resource: string = 'Resource'): ApiError {
        return new ApiError(404, \`\${resource} not found\`)
    }

    static conflict(message: string = 'Resource already exists'): ApiError {
        return new ApiError(409, message)
    }

    static validation(error: ZodError): ApiError {
        const details = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }))
        return new ApiError(400, 'Validation error', details)
    }

    static missingParam(param: string): ApiError {
        return new ApiError(400, \`Missing required parameter: \${param}\`)
    }

    static internal(message: string = 'Internal server error'): ApiError {
        return new ApiError(500, message)
    }

    static handle(error: any, c: Context, entityName: string = 'Resource'): Response {
        console.error(\`[\${entityName}] Error:\`, error)

        if (error instanceof ApiError) {
            return c.json({
                success: false,
                message: error.message,
                data: error.details || null
            }, error.statusCode)
        }

        if (error.name === 'ZodError') {
            const zodError = error as ZodError
            const details = zodError.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }))
            return c.json({
                success: false,
                message: 'Validation error',
                data: details
            }, 400)
        }

        if (error.message?.includes('not found')) {
            return c.json({
                success: false,
                message: \`\${entityName} not found\`,
                data: null
            }, 404)
        }

        if (error.message?.includes('Access denied')) {
            return c.json({
                success: false,
                message: error.message,
                data: null
            }, 403)
        }

        return c.json({
            success: false,
            message: error.message || 'Internal server error',
            data: null
        }, 500)
    }
}
`
