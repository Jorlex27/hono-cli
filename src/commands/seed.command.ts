import chalk from 'chalk'
import { seederManager } from '@/core/managers/seeder.manager'

/**
 * Seed a specific module
 */
export const seedCommand = async (moduleName: string): Promise<void> => {
  try {
    console.log(chalk.blue(`🌱 Starting seed for: ${moduleName}`))
    console.log()

    await seederManager.seed(moduleName)

    console.log()
    console.log(chalk.green(`✅ Successfully seeded ${moduleName}`))
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Unseed a specific module
 */
export const unseedCommand = async (moduleName: string): Promise<void> => {
  try {
    console.log(chalk.blue(`🗑️  Starting unseed for: ${moduleName}`))
    console.log()

    await seederManager.unseed(moduleName)

    console.log()
    console.log(chalk.green(`✅ Successfully unseeded ${moduleName}`))
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Seed all modules
 */
export const seedAllCommand = async (): Promise<void> => {
  try {
    await seederManager.seedAll()
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Unseed all modules
 */
export const unseedAllCommand = async (): Promise<void> => {
  try {
    await seederManager.unseedAll()
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Refresh seeds (unseed then seed)
 */
export const seedRefreshCommand = async (moduleName?: string): Promise<void> => {
  try {
    await seederManager.refresh(moduleName)

    console.log()
    if (moduleName) {
      console.log(chalk.green(`✅ Successfully refreshed ${moduleName}`))
    } else {
      console.log(chalk.green('✅ Successfully refreshed all modules'))
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}

/**
 * Show seeder status
 */
export const seedStatusCommand = async (): Promise<void> => {
  try {
    await seederManager.displayStatus()
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}
