import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import type { ModuleFile } from '@/types'
import { DIRECTORIES, MESSAGES } from '@config/constants'
import { generateCaseVariations } from '@utils/text.util'
import { validateName } from '@utils/validation.util'
import { ModuleExistsError, handleError } from '@utils/errors.util'
import { updateCollectionsConfig } from '@/core/managers/collection.manager'
import { updateRouteManager } from '@/core/managers/route.manager'
import {
  generateTypesTemplate,
  generateValidatorTemplate,
  generateControllerTemplate,
  generateServiceTemplate,
  generateRouteTemplate,
  generateSeederTemplate,
} from '@/templates/module.template'

/**
 * Generates a complete module with all necessary files
 */
export const generateModule = async (name: string): Promise<void> => {
  try {
    validateName(name)

    const caseVariations = generateCaseVariations(name)
    const { kebab, pascal, camel, upper } = caseVariations

    const moduleDir = path.join(process.cwd(), DIRECTORIES.MODULES, kebab)

    // Check if module already exists
    const exists = await fs
      .access(moduleDir)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      throw new ModuleExistsError(kebab)
    }

    // Update collections first
    console.log(chalk.blue(MESSAGES.INFO.UPDATING_COLLECTIONS))
    await updateCollectionsConfig(kebab)

    // Create module directory
    await fs.mkdir(moduleDir, { recursive: true })

    // Generate files
    const files: ModuleFile[] = [
      {
        filename: `${kebab}.types.ts`,
        content: generateTypesTemplate(pascal),
      },
      {
        filename: `${kebab}.validation.ts`,
        content: generateValidatorTemplate(camel),
      },
      {
        filename: `${kebab}.controller.ts`,
        content: generateControllerTemplate(pascal, kebab, camel),
      },
      {
        filename: `${kebab}.service.ts`,
        content: generateServiceTemplate(pascal, kebab, upper),
      },
      {
        filename: `${kebab}.routes.ts`,
        content: generateRouteTemplate(pascal, kebab, camel),
      },
      {
        filename: `${kebab}.seed.ts`,
        content: generateSeederTemplate(pascal, kebab, camel),
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

    console.log(chalk.green(MESSAGES.SUCCESS.MODULE_GENERATED(kebab)))
  } catch (error) {
    if (error instanceof ModuleExistsError) {
      console.log(chalk.yellow(error.message))
      return
    }
    handleError(error, MESSAGES.ERROR.GENERATION_FAILED('module'))
  }
}
