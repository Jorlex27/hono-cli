export const controllerIndexTemplate = `import { ApiError } from "@/shared/errors"
import { Context } from "hono"
import { z } from "zod"
import { QueryParser } from "../query"
import { BaseInput, BaseModel, ServiceContext } from "../service/types"
import { ControllerOptions } from "./types"

export function createController<T extends BaseModel, U extends BaseInput<T>>(
    options: ControllerOptions<T, U>
) {
    const { service, validationSchema, validationUpdateSchema, entityName = 'Item', hooks, findByIdOptions = {} } = options

    const extractContext = (c: Context): ServiceContext => ({
        user: c.get('user'),
        userId: c.get('user')?._id,
        metadata: {
            ip: c.get('clientIP'),
            userAgent: c.req.header('user-agent')
        }
    })

    return {
        getAll: async (c: Context) => {
            try {
                const context = extractContext(c)
                const result = await service.findAll(c, context)

                return c.json({
                    success: true,
                    message: 'Success',
                    data: result
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        getById: async (c: Context) => {
            try {
                const params = new QueryParser().parse(c.req.query())
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const context = extractContext(c)
                const item = await service.findById(id, context, params, findByIdOptions)
                return c.json({
                    success: true,
                    message: 'Success',
                    data: item
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        create: async (c: Context) => {
            try {
                const data = await c.req.json()
                const context = extractContext(c)

                let validatedData: U
                if (validationSchema) {
                    const validation = validationSchema.safeParse(data)
                    if (!validation.success) {
                        throw ApiError.validation(validation.error)
                    }
                    validatedData = validation.data
                } else {
                    validatedData = data as U
                }

                if (hooks?.beforeCreate) {
                    await hooks.beforeCreate(validatedData, context, c)
                }

                const newItem = await service.create(validatedData, context)

                if (hooks?.afterCreate) {
                    await hooks.afterCreate(validatedData, context, c)
                }

                return c.json({
                    success: true,
                    message: \`\${entityName} created successfully\`,
                    data: newItem
                }, 201)
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        update: async (c: Context) => {
            try {
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const data = await c.req.json()
                const context = extractContext(c)

                const checkValidation = (): z.ZodTypeAny => {
                    const validation = validationUpdateSchema || validationSchema
                    try {
                        return validation.partial()
                    } catch (error) {
                        return validation
                    }
                }

                let validatedData: Partial<T>
                if (checkValidation()) {
                    const validate = checkValidation().safeParse(data)
                    if (!validate.success) {
                        throw ApiError.validation(validate.error)
                    }
                    validatedData = validate.data as Partial<T>
                } else {
                    validatedData = data as Partial<T>
                }

                if (hooks?.beforeUpdate) {
                    await hooks.beforeUpdate(validatedData, context, c)
                }

                const updatedItem = await service.update(id, validatedData, context)

                if (hooks?.afterUpdate) {
                    await hooks.afterUpdate(validatedData, context, c)
                }

                return c.json({
                    success: true,
                    message: \`\${entityName} updated successfully\`,
                    data: updatedItem
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        delete: async (c: Context) => {
            try {
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const context = extractContext(c)

                if (hooks?.beforeDelete) {
                    await hooks.beforeDelete({} as Partial<T>, context, c)
                }

                const result = await service.delete(id, context)

                if (hooks?.afterDelete) {
                    await hooks.afterDelete({} as Partial<T>, context, c)
                }

                const message = service.options.softDelete
                    ? \`\${entityName} moved to trash\`
                    : \`\${entityName} deleted permanently\`

                return c.json({
                    success: true,
                    message,
                    data: result
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        restore: async (c: Context) => {
            try {
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const context = extractContext(c)
                const restoredItem = await service.restore(id, context)

                return c.json({
                    success: true,
                    message: \`\${entityName} restored successfully\`,
                    data: restoredItem
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        bulkCreate: async (c: Context) => {
            try {
                const dataArray = await c.req.json()

                if (!Array.isArray(dataArray)) {
                    throw ApiError.badRequest('Expected array of items')
                }

                const context = extractContext(c)
                const result = await service.createMany(dataArray, context)

                return c.json({
                    success: true,
                    message: \`\${dataArray.length} \${entityName}s created successfully\`,
                    data: result
                }, 201)
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        getStats: async (c: Context) => {
            try {
                const stats = await service.getStats()

                return c.json({
                    success: true,
                    message: 'Statistics retrieved successfully',
                    data: stats
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        // Placeholder for export functionality
        // export: async (c: Context) => {
        //     try {
        //         checkAccess(c)
        //         const { format = 'json' } = c.req.query()
        //         const context = extractContext(c)
        //
        //         // Implement your export logic here
        //         // Example: const data = await service.findAllWithPipelineData(c, undefined, undefined, context)
        //
        //         return c.json({
        //             success: true,
        //             message: 'Export functionality not implemented',
        //             data: null
        //         })
        //     } catch (error) {
        //         return ApiError.handle(error, c, entityName)
        //     }
        // },

        extractContext
    }
}`