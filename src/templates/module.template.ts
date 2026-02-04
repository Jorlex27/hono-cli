// Zod-first approach: single schema.ts file
export const generateSchemaTemplate = (name: string): string => `
import { z } from 'zod'
import { ObjectId } from 'mongodb'
import { BaseModel } from '@/shared/service/types'

// ============================================
// Zod Schema - Single source of truth
// ============================================

export const ${name.toLowerCase()}Schema = z.object({
    // Add your fields here
    // Example:
    // name: z.string().min(1, 'Name is required'),
    // email: z.string().email('Invalid email'),
    // status: z.enum(['active', 'inactive']).default('active'),
    // parentId: z.string().optional(), // for ObjectId references
})

// Schema for updates (all fields optional)
export const ${name.toLowerCase()}UpdateSchema = ${name.toLowerCase()}Schema.partial()

// ============================================
// Inferred Types from Zod Schema
// ============================================

// Input type for creating new documents
export type ${name}Input = z.infer<typeof ${name.toLowerCase()}Schema>

// Full document type with BaseModel fields
export interface ${name}Data extends BaseModel, ${name}Input {
    // Add computed/lookup fields here if needed
    // Example:
    // parent?: { _id: ObjectId; name: string }
}

// Update type
export type ${name}Update = z.infer<typeof ${name.toLowerCase()}UpdateSchema>
`

// Legacy types template (for backwards compatibility)
export const generateTypesTemplate = (name: string): string => `
import { BaseInput, BaseModel } from '@/shared/service/types'

export interface ${name}Data extends BaseModel {
    // Add your schema here
}

export type ${name}Input = BaseInput<${name}Data>
`

// Legacy validation template (for backwards compatibility)
export const generateValidatorTemplate = (name: string): string => `
import { z } from 'zod'

export const ${name.toLowerCase()}Schema = z.object({
    // Add your schema validation here
})
`

export const generateControllerTemplate = (name: string, kebabName: string, camelName: string): string => `
import type { Context } from 'hono'
import { createController } from '@/shared/controller'
import { ${camelName}Service } from './${kebabName}.service'
import { ${camelName}Schema } from './${kebabName}.schema'

const baseController = createController({
    service: ${camelName}Service,
    validationSchema: ${camelName}Schema,
    entityName: '${name}',
    // hooks: {
    //     beforeCreate: async (data, context, c) => {},
    //     afterCreate: async (item, context, c) => {},
    //     beforeUpdate: async (id, data, context, c) => {},
    //     afterUpdate: async (id, data, context, c) => {},
    //     beforeDelete: async (id, context, c) => {},
    //     afterDelete: async (id, context, c) => {},
    // },
})

export const ${camelName}Controller = {
    ...baseController,

    // Add custom controller methods here
    // Example:
    // async customMethod(c: Context) {
    //     const context = baseController.extractContext(c)
    //     // ... your logic
    //     return c.json({ success: true, data: result })
    // },
}
`

export const generateServiceTemplate = (name: string, kebabName: string, upperName: string, camelName: string): string => `
import { COLLECTIONS } from '@/config/collections.config'
import { BaseService } from '@/shared/service'
import type { ${name}Data, ${name}Input } from './${kebabName}.schema'

export const ${camelName}Service = new BaseService<${name}Data, ${name}Input>({
    collectionName: COLLECTIONS.${upperName},
    softDelete: true,

    // Search & Filter
    searchFields: ['name'],
    filterFields: ['status', 'createdAt'],
    sortFields: ['name', 'createdAt'],
    defaultSort: { createdAt: -1 },

    // Lookups configuration
    // lookups: {
    //     parent: {
    //         from: 'parents',
    //         localField: 'parentId',
    //         foreignField: '_id',
    //         as: 'parent',
    //         project: { _id: 1, name: 1 },
    //         isUnwind: true,
    //     },
    // },
    // optionalLookups: {},
    // findByIdLookups: ['parent'], // or custom config

    // Context-based filtering (multi-tenant)
    // appFilterFields: ['appId'],
    // userFilterFields: ['userId'],
    // tahunAjaran: false,

    // Lifecycle hooks
    // beforeCreate: async (data, context) => data,
    // afterCreate: async (item, context) => item,
    // beforeUpdate: async (id, data, context) => data,
    // afterUpdate: async (id, item, context) => item,
    // beforeDelete: async (id, context) => {},
    // afterDelete: async (id, context) => {},
})

// Extend service with custom methods if needed
// Example:
// class ${name}ServiceExtended extends BaseService<${name}Data, ${name}Input> {
//     async customMethod() { ... }
// }
`

export const generateRouteTemplate = (_pascalName: string, kebabName: string, camelName: string): string => `
import { Hono } from 'hono'
import { ${camelName}Controller } from './${kebabName}.controller'

export const ${camelName}Router = new Hono()
    // List & Count
    .get('/', ${camelName}Controller.getAll)
    .get('/count', ${camelName}Controller.getCount)
    .get('/stats', ${camelName}Controller.getStats)

    // CRUD
    .get('/:id', ${camelName}Controller.getById)
    .post('/', ${camelName}Controller.create)
    .post('/bulk', ${camelName}Controller.bulkCreate)
    .patch('/:id', ${camelName}Controller.update)

    // Soft delete flow
    .delete('/:id', ${camelName}Controller.delete)           // soft delete
    .post('/:id/restore', ${camelName}Controller.restore)    // restore
    .delete('/:id/hard', ${camelName}Controller.hardDelete)  // permanent delete
`

export const generateSeederTemplate = (pascalName: string, kebabName: string, camelName: string): string => `
import { ${camelName}Service } from './${kebabName}.service'
import type { ${pascalName}Input } from './${kebabName}.schema'

export class ${pascalName}Seeder {
    constructor(private service: typeof ${camelName}Service) {}

    async seed(): Promise<string[]> {
        console.log('🌱 Seeding ${kebabName}...')

        const data: ${pascalName}Input[] = [
            // Add your seed data here
            // Example:
            // { name: 'Sample ${pascalName} 1' },
            // { name: 'Sample ${pascalName} 2' },
        ]

        if (data.length === 0) {
            console.log('⚠️  No seed data defined for ${kebabName}')
            return []
        }

        const items = await this.service.createMany(data, undefined, { skipFindById: true })

        console.log(\`✅ Seeded \${items.length} ${kebabName}(s)\`)
        return items.map((item) => item._id.toString())
    }

    async unseed(): Promise<void> {
        console.log('🗑️  Unseeding ${kebabName}...')

        await this.service.advanceDelete({}, undefined, { operation: 'all' })

        console.log('✅ Unseeded ${kebabName}(s)')
    }
}
`

export const generateIndexTemplate = (_pascalName: string, kebabName: string, camelName: string): string => `
export { ${camelName}Controller } from './${kebabName}.controller'
export { ${camelName}Router } from './${kebabName}.routes'
export { ${camelName}Service } from './${kebabName}.service'
export * from './${kebabName}.schema'
`
