import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { DIRECTORIES, MESSAGES } from '@config/constants'
import { generateCaseVariations } from '@utils/text.util'
import { validateName } from '@utils/validation.util'
import { ModuleExistsError, handleError } from '@utils/errors.util'
import { updateRouteManager } from '@/core/managers/route.manager'
import { generateRouteTemplate } from '@/templates/module.template'

/**
 * Generates a standalone router without the full module structure
 */
export const generateRouter = async (name: string): Promise<void> => {
  try {
    validateName(name)

    const caseVariations = generateCaseVariations(name)
    const { kebab, pascal, camel } = caseVariations

    const moduleDir = path.join(process.cwd(), DIRECTORIES.MODULES, kebab)

    // Check if module already exists
    const exists = await fs
      .access(moduleDir)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      throw new ModuleExistsError(kebab)
    }

    // Create module directory
    await fs.mkdir(moduleDir, { recursive: true })

    // Generate router files
    const files = [
      {
        filename: `${kebab}.routes.ts`,
        content: generateRouteTemplate(pascal, kebab, camel),
      },
      {
        filename: 'index.ts',
        content: `export * from './${kebab}.routes'\n`,
      },
    ]

    // Create all files
    for (const file of files) {
      await fs.writeFile(path.join(moduleDir, file.filename), file.content)
    }

    // Update route manager
    await updateRouteManager(kebab, camel)

    console.log(chalk.green(MESSAGES.SUCCESS.ROUTER_GENERATED(kebab)))
  } catch (error) {
    if (error instanceof ModuleExistsError) {
      console.log(chalk.yellow(error.message))
      return
    }
    handleError(error, MESSAGES.ERROR.GENERATION_FAILED('router'))
  }
}
