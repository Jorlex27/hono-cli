import chalk from 'chalk'
import { initializeProject } from '@/core/generators/project.generator'

/**
 * Command handler for initializing a new project
 */
export const initCommand = async (projectName: string): Promise<void> => {
  try {
    await initializeProject(projectName)
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}
