export const generateTypesTemplate = (name: string): string => `
import { BaseModel } from '@/shared/service/types'

export interface ${name}Data extends BaseModel {
    // Add your schema here
}
    
export type ${name}Input = Omit<${name}Data, '_id' | 'createdAt' | 'updatedAt'>
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

const baseSantriController = createController({
    service: ${name.toLowerCase()}Service,
    validationSchema: ${camelName}Schema,
    // formatData: (data) => data,
    entityName: '${name}'
})

export const ${camelName}Controller = {
    ...baseSantriController,

    // Add your custom methods here
}`

export const generateServiceTemplate = (name: string, kebabName: string, upperName: string): string => `
import { COLLECTIONS } from '@/config/collections.config'
import { BaseService, createService } from '@/shared/service'
import type { ${name}Data, ${name}Input } from './${kebabName}.types'

export const ${name.toLowerCase()}Service = createService<${name}Data, ${name}Input>({
    collectionName: COLLECTIONS.${upperName},
    aggregatePipeline: async () => [], // Add your aggregation pipeline here

    // Add your custom methods here
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
        .put('/:id', ${camelName}Controller.update)
        .delete('/:id', ${camelName}Controller.delete)
    `