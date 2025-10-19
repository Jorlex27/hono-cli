import chalk from 'chalk'
import { generateModule } from '@/core/generators/module.generator'
import { generateRouter } from '@/core/generators/router.generator'

/**
 * Command handler for generating a module
 */
export const generateModuleCommand = async (name: string): Promise<void> => {
  try {
    await generateModule(name.toLowerCase())
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Command handler for generating a router
 */
export const generateRouterCommand = async (name: string): Promise<void> => {
  try {
    await generateRouter(name.toLowerCase())
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}
