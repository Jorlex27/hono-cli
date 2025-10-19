import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { toConstantCase, toSnakeCase } from '@utils/text.util'
import { handleError } from '@utils/errors.util'

/**
 * Generates the collections config template
 */
export const generateCollectionTemplate = (collections: string[]): string => {
  const sortedCollections = [...new Set(collections)].sort()

  const collectionsObject = sortedCollections
    .map(name => {
      const constName = toConstantCase(name)
      const snakeName = toSnakeCase(name)
      return `    ${constName}: '${snakeName}'`
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

/**
 * Updates the collections config file with a new module
 */
export const updateCollectionsConfig = async (newModule: string): Promise<void> => {
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
          .map(m => m.toLowerCase())
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
    handleError(error, 'Failed to update collections config')
  }
}
