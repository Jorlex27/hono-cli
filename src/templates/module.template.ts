export const generateTypesTemplate = (name: string): string => `
import { BaseInput, BaseModel } from '@/shared/service/types'

export interface ${name}Data extends BaseModel {
    // Add your schema here
}

export type ${name}Input = BaseInput<${name}Data>
`

export const generateValidatorTemplate = (name: string): string => `
import { z } from "zod"

export const ${name}Schema = z.object({
    // Add your schema validation here
})
`

export const generateControllerTemplate = (name: string, kebabName: string, camelName: string): string => `
import type { Context } from "hono"
import { createController } from '@/shared/controller'
import { ${name.toLowerCase()}Service } from './${kebabName}.service'
import { ${camelName}Schema } from './${kebabName}.validation'

const baseController = createController({
    service: ${name.toLowerCase()}Service,
    validationSchema: ${camelName}Schema,
    entityName: '${name}',
    // hooks: {
    //     beforeCreate: async (data, context, c) => {},
    //     afterCreate: async (data, context, c) => {},
    // },
})

export const ${camelName}Controller = {
    ...baseController,

    // Add your custom methods here
}`

export const generateServiceTemplate = (name: string, kebabName: string, upperName: string): string => `
import { COLLECTIONS } from '@/config/collections.config'
import { BaseService } from '@/shared/service'
import type { ${name}Data, ${name}Input } from './${kebabName}.types'

export const ${name.toLowerCase()}Service = new BaseService<${name}Data, ${name}Input>({
    collectionName: COLLECTIONS.${upperName},
    softDelete: true,
    // searchFields: ['name'],
    // filterFields: ['status', 'createdAt'],
    // sortFields: ['name', 'createdAt'],
    aggregatePipeline: async () => [], // Add your aggregation pipeline here

    // Lifecycle hooks
    // beforeCreate: async (data, context) => data,
    // afterCreate: async (item, context) => item,
    // beforeUpdate: async (id, data, context) => data,
    // afterUpdate: async (item, context) => item,
    // beforeDelete: async (id, context) => {},
    // afterDelete: async (id, context) => {},
})
`

export const generateRouteTemplate = (pascalName: string, kebabName: string, camelName: string): string => `
import { Hono } from 'hono'
import { ${camelName}Controller } from './${kebabName}.controller'

export const ${camelName}Router =
    new Hono()
        .get('/', ${camelName}Controller.getAll)
        .get('/:id', ${camelName}Controller.getById)
        .post('/', ${camelName}Controller.create)
        .post('/restore/:id', ${camelName}Controller.restore)
        .put('/:id', ${camelName}Controller.update)
        .delete('/:id', ${camelName}Controller.delete)
    `