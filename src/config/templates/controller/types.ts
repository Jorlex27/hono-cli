export const controllerTypesTemplate = `import { Context } from "hono"
import { z } from "zod"
import { BaseService } from "../service"
import { BaseModel, BaseInput, ServiceContext } from "../service/types"

export interface ControllerHooks<T extends BaseModel, U extends BaseInput<T>> {
    beforeCreate?: (data: U, context: ServiceContext, c: Context) => Promise<void> | void
    afterCreate?: (data: U, context: ServiceContext, c: Context) => Promise<void> | void
    beforeUpdate?: (data: Partial<T>, context: ServiceContext, c: Context) => Promise<void> | void
    afterUpdate?: (data: Partial<T>, context: ServiceContext, c: Context) => Promise<void> | void
    beforeDelete?: (data: Partial<T>, context: ServiceContext, c: Context) => Promise<void> | void
    afterDelete?: (data: Partial<T>, context: ServiceContext, c: Context) => Promise<void> | void
}

export interface ControllerOptions<T extends BaseModel, U extends BaseInput<T>> {
    service: BaseService<T, U>
    validationSchema?: z.ZodSchema<U>
    validationUpdateSchema?: z.ZodSchema<Partial<T>>
    entityName?: string

    // Hooks
    hooks?: ControllerHooks<T, U>

    // FindById options
    findByIdOptions?: {
        includeDeleted?: boolean
    }
}`