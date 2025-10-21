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
import { ${camelName}Service } from './${kebabName}.service'
import { ${camelName}Schema } from './${kebabName}.validation'

const baseController = createController({
    service: ${camelName}Service,
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

export const generateServiceTemplate = (name: string, kebabName: string, upperName: string, camelName: string): string => `
import { COLLECTIONS } from '@/config/collections.config'
import { BaseService } from '@/shared/service'
import type { ${name}Data, ${name}Input } from './${kebabName}.types'

export const ${camelName}Service = new BaseService<${name}Data, ${name}Input>({
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

export const generateSeederTemplate = (pascalName: string, kebabName: string, camelName: string): string => `
import { ${camelName}Service } from './${kebabName}.service'
import type { ${pascalName}Input } from './${kebabName}.types'

export class ${pascalName}Seeder {
    private seededIds: string[] = []

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

        const items = await this.service.createMany(data, {})
        this.seededIds = items.map((item) => item._id.toString())

        console.log(\`✅ Seeded \${items.length} ${kebabName}(s)\`)
        return this.seededIds
    }

    async unseed(): Promise<void> {
        console.log('🗑️  Unseeding ${kebabName}...')

        if (this.seededIds.length === 0) {
            console.log('⚠️  No seeded IDs to unseed for ${kebabName}')
            return
        }

        await this.service.deleteMany(
            { _id: { $in: this.seededIds } },
            {}
        )

        console.log(\`✅ Unseeded \${this.seededIds.length} ${kebabName}(s)\`)
        this.seededIds = []
    }

    getSeededIds(): string[] {
        return this.seededIds
    }

    setSeededIds(ids: string[]): void {
        this.seededIds = ids
    }
}
`