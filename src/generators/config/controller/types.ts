export const controllerTypesTemplate = `import { z } from "zod"
import { BaseService } from "../service"
import { BaseModel, BaseInput } from "../service/types"

export interface ControllerOptions<T extends BaseModel, U extends BaseInput> {
    service: BaseService<T, U>
    validationSchema?: z.ZodSchema<U>
    formatData?: (data: any) => U
    entityName?: string
}`