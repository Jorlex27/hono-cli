export const controllerIndexTemplate = `import { getPaginationParams } from "@/shared/pagination"
import type { Context } from "hono"
import { BaseInput, BaseModel } from "../service/types"
import { ControllerOptions } from "./types"

export function createController<T extends BaseModel, U extends BaseInput>(
    options: ControllerOptions<T, U>
) {
    const {
        service,
        validationSchema,
        formatData = (data) => data as U,
        entityName = 'Item'
    } = options

    return {
        // Get all items with pagination
        getAll: async (c: Context) => {
            try {
                const params = await getPaginationParams(c)
                const items = await service.findAll(params)
                return c.json({
                    success: true,
                    message: "Success",
                    data: items
                })
            } catch (error) {
                throw error
            }
        },

        // Get item by ID
        getById: async (c: Context) => {
            try {
                const id = c.req.param("id")
                const item = await service.findById(id)
                return c.json({
                    success: true,
                    message: "Success",
                    data: item
                })
            } catch (error) {
                throw error
            }
        },

        // Create new item
        create: async (c: Context) => {
            try {
                const data = await c.req.json()

                // Validate if schema provided
                if (validationSchema) {
                    const validation = validationSchema.safeParse(data)
                    if (!validation.success) {
                        return c.json({
                            success: false,
                            message: "Validation Error",
                            data: validation.error
                        }, 400)
                    }

                    const formattedData = formatData(validation.data)
                    const newItem = await service.create(formattedData)

                    return c.json({
                        success: true,
                        message: \`\${entityName} created successfully\`,
                        data: newItem
                    })
                } else {
                    // No validation, use data directly
                    const newItem = await service.create(data as U)
                    return c.json({
                        success: true,
                        message: \`\${entityName} created successfully\`,
                        data: newItem
                    })
                }
            } catch (error) {
                throw error
            }
        },

        // Update item
        update: async (c: Context) => {
            try {
                const id = c.req.param("id")
                const data = await c.req.json()

                // Validate if schema provided
                if (validationSchema) {
                    const validation = validationSchema.safeParse(data)
                    if (!validation.success) {
                        return c.json({
                            success: false,
                            message: "Validation Error",
                            data: validation.error
                        }, 400)
                    }

                    // Format data if needed
                    const formattedData = formatData(validation.data) as unknown as Partial<T>
                    const updatedItem = await service.update(id, formattedData)

                    return c.json({
                        success: true,
                        message: \`\${entityName} updated successfully\`,
                        data: updatedItem
                    })
                } else {
                    // No validation, use data directly
                    const updatedItem = await service.update(id, data as Partial<T>)
                    return c.json({
                        success: true,
                        message: \`\${entityName} updated successfully\`,
                        data: updatedItem
                    })
                }
            } catch (error) {
                throw error
            }
        },

        // Delete item
        delete: async (c: Context) => {
            try {
                const id = c.req.param("id")

                const find = await service.findById(id)
                if (!find) {
                    return c.json({
                        success: false,
                        message: \`\${entityName} not found\`,
                        data: null
                    }, 404)
                }

                const result = await service.delete(id)
                return c.json({
                    success: true,
                    message: \`\${entityName} deleted successfully\`,
                    data: result
                })
            } catch (error) {
                throw error
            }
        }
    }
}`