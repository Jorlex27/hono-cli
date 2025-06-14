import { toCamelCase, toKebabCase, toPascalCase } from '@/helpers/text.helpers'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import { generateRouteTemplate } from '../templates/module.template'
import { updateRouteManager } from '../utils/route.util'

export const generateRouter = async (name: string) => {
    try {
        // Generate different case variations
        const kebabName = toKebabCase(name)
        const pascalName = toPascalCase(name)
        const camelName = toCamelCase(name)
        
        const moduleDir = path.join(process.cwd(), 'src/modules', kebabName)

        // Check if module already exists
        const exists = await fs.access(moduleDir).then(() => true).catch(() => false)
        if (exists) {
            console.log(chalk.yellow(`Module ${kebabName} already exists!`))
            return
        }

        // Create module directory
        await fs.mkdir(moduleDir, { recursive: true })

        // Generate router files
        const files = [
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

        // Update route manager
        await updateRouteManager(kebabName, camelName)

        console.log(chalk.green(`✨ Router ${kebabName} generated successfully!`))
    } catch (error) {
        console.error(chalk.red('Error generating router:'), error)
        throw error
    }
}