import { toCamelCase, toConstantCase, toKebabCase, toPascalCase, toSnakeCase } from '@/helpers/text.helpers'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import { updateCollectionsConfig } from '../templates/collection.template'
import {
    generateControllerTemplate,
    generateRouteTemplate,
    generateServiceTemplate,
    generateTypesTemplate,
    generateValidatorTemplate
} from '../templates/module.template'
import { updateRouteManager } from '../utils/route.util'

interface ModuleFile {
    filename: string;
    content: string;
}

export const generateModule = async (name: string) => {
    try {
        // Generate different case variations
        const kebabName = toKebabCase(name)
        const pascalName = toPascalCase(name)
        const upperName = toConstantCase(name)
        const camelName = toCamelCase(name)
        
        const moduleDir = path.join(process.cwd(), 'src/modules', kebabName)

        // Check if module already exists
        const exists = await fs.access(moduleDir).then(() => true).catch(() => false)
        if (exists) {
            console.log(chalk.yellow(`Module ${kebabName} already exists!`))
            return
        }

        // Update collections first
        console.log(chalk.blue('Updating collections configuration...'))
        await updateCollectionsConfig(kebabName)

        // Create module directory
        await fs.mkdir(moduleDir, { recursive: true })

        // Generate files with explicit typing
        const files: ModuleFile[] = [
            {
                filename: `${kebabName}.types.ts`,
                content: generateTypesTemplate(pascalName)
            },
            {
                filename: `${kebabName}.validation.ts`,
                content: generateValidatorTemplate(camelName)
            },
            {
                filename: `${kebabName}.controller.ts`,
                content: generateControllerTemplate(pascalName, kebabName, camelName)
            },
            {
                filename: `${kebabName}.service.ts`,
                content: generateServiceTemplate(pascalName, kebabName, upperName)
            },
            {
                filename: `${kebabName}.routes.ts`,
                content: generateRouteTemplate(pascalName, kebabName, camelName)
            },
            {
                filename: 'index.ts',
                content: `export * from './${kebabName}.routes'`
            }
        ]

        // Create all files
        for (const file of files) {
            await fs.writeFile(
                path.join(moduleDir, file.filename),
                file.content
            )
        }

        await updateRouteManager(kebabName, camelName)

        console.log(chalk.green(`✨ Module ${kebabName} generated successfully!`))
    } catch (error) {
        console.error(chalk.red('Error generating module:'), error)
        throw error
    }
}