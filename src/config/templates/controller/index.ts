export const controllerIndexTemplate = `import { ApiError } from '@/shared/errors'
import { Context } from 'hono'
import { z } from 'zod'
import { BaseInput, BaseModel, ServiceContext } from '../service/types'
import { ControllerOptions } from './types'

export function createController<T extends BaseModel, U extends BaseInput<T>>(
    options: ControllerOptions<T, U>
) {
    const {
        service,
        validationSchema,
        validationUpdateSchema,
        entityName = 'Item',
        hooks,
        findByIdOptions = {},
    } = options

    const extractContext = (c: Context): ServiceContext => {
        const contextFromMiddleware = c.get('context') as ServiceContext | undefined

        return {
            user: contextFromMiddleware?.user || c.get('user'),
            userId: contextFromMiddleware?.userId || c.get('user')?._id?.toString(),
            appId: contextFromMiddleware?.appId,
            appFilter: contextFromMiddleware?.appFilter,
            userFilter: contextFromMiddleware?.userFilter,
            tahunAjaranId: contextFromMiddleware?.tahunAjaranId,
            metadata: {
                ip: c.get('clientIP'),
                userAgent: c.req.header('user-agent'),
                ...contextFromMiddleware?.metadata,
            },
        }
    }

    return {
        getAll: async (c: Context) => {
            try {
                const context = extractContext(c)
                const result = await service.findAll(c, context)

                return c.json({
                    success: true,
                    data: {
                        items: result.data,
                        pagination: {
                            total: result.total,
                            page: result.page,
                            limit: result.limit,
                            totalPages: result.totalPages,
                            hasNext: result.hasNext,
                            hasPrev: result.hasPrev,
                        },
                    },
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        getById: async (c: Context) => {
            try {
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const context = extractContext(c)
                const item = await service.findById(id, context, findByIdOptions)

                return c.json({
                    success: true,
                    data: item,
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
                    await hooks.afterCreate(newItem, context, c)
                }

                return c.json(
                    {
                        success: true,
                        data: newItem,
                    },
                    201
                )
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

                const checkValidation = (): z.ZodTypeAny | undefined => {
                    const validation = validationUpdateSchema || validationSchema
                    if (!validation) return undefined
                    try {
                        return validation.partial()
                    } catch {
                        return validation
                    }
                }

                let validatedData: Partial<T>
                const schema = checkValidation()
                if (schema) {
                    const validate = schema.safeParse(data)
                    if (!validate.success) {
                        throw ApiError.validation(validate.error)
                    }
                    validatedData = validate.data as Partial<T>
                } else {
                    validatedData = data as Partial<T>
                }

                if (hooks?.beforeUpdate) {
                    await hooks.beforeUpdate(id, validatedData, context, c)
                }

                const updatedItem = await service.update(id, validatedData, context)

                if (hooks?.afterUpdate) {
                    await hooks.afterUpdate(id, validatedData, context, c)
                }

                return c.json({
                    success: true,
                    data: updatedItem,
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
                    await hooks.beforeDelete(id, context, c)
                }

                const result = await service.delete(id, context)

                if (hooks?.afterDelete) {
                    await hooks.afterDelete(id, context, c)
                }

                return c.json({
                    success: true,
                    data: result,
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
                    data: restoredItem,
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        hardDelete: async (c: Context) => {
            try {
                const id = c.req.param('id')
                if (!id) throw ApiError.missingParam('id')

                const context = extractContext(c)

                if (hooks?.beforeDelete) {
                    await hooks.beforeDelete(id, context, c)
                }

                const result = await service.hardDelete(id, context)

                if (hooks?.afterDelete) {
                    await hooks.afterDelete(id, context, c)
                }

                return c.json({
                    success: true,
                    data: result,
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

                return c.json(
                    {
                        success: true,
                        data: result,
                    },
                    201
                )
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        getStats: async (c: Context) => {
            try {
                const context = extractContext(c)
                const stats = await service.getStats(context)

                return c.json({
                    success: true,
                    data: stats,
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        getCount: async (c: Context) => {
            try {
                const context = extractContext(c)
                const count = await service.countDocuments(c, context)

                return c.json({
                    success: true,
                    data: { count },
                })
            } catch (error) {
                return ApiError.handle(error, c, entityName)
            }
        },

        extractContext,
    }
}`
