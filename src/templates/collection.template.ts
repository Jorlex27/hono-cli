import { pluralize, toConstantCase, toSnakeCase } from "@/helpers/text.helpers"
import chalk from "chalk"
import fs from "fs/promises"
import path from "path"

export const generateCollectionTemplate = (collections: string[]): string => {
    // Sort collections alphabetically
    const sortedCollections = [...new Set(collections)].sort()
    
    const collectionsObject = sortedCollections
        .map(name => {
            const constName = toConstantCase(name)
            const snakelName = toSnakeCase(name)
            return `    ${constName}: '${snakelName}'`
        })
        .join(',\n')

    return `// This file is auto-generated. Do not edit manually
// Generated on: ${new Date().toISOString()}

export const COLLECTIONS = {
${collectionsObject}
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// Collection names mapping
export const collectionNames = Object.values(COLLECTIONS)
`
}

export const updateCollectionsConfig = async (newModule: string) => {
    const configPath = path.join(process.cwd(), 'src/config/collections.config.ts')
    
    try {
        let existingCollections: string[] = []
        try {
            const content = await fs.readFile(configPath, 'utf-8')
            const matches = content.match(/['"]([^'"]+)['"]/g)
            if (matches) {
                existingCollections = matches
                    .map(m => m.replace(/['"]/g, ''))
                    .filter(m => m !== 'collections.config.ts')
                    .map(m => m.toLowerCase()) // Normalize to lowercase
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error
            }
        }

        // Add new module if it doesn't exist
        if (!existingCollections.includes(newModule.toLowerCase())) {
            existingCollections.push(newModule.toLowerCase())
        }

        const content = generateCollectionTemplate(existingCollections)
        await fs.mkdir(path.dirname(configPath), { recursive: true })
        await fs.writeFile(configPath, content)
        
        console.log(chalk.blue(`Updated collections config with ${chalk.bold(newModule)} module`))
    } catch (error) {
        console.error(chalk.red('Error updating collections config:'), error)
        throw error
    }
}