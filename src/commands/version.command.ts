import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import type { PackageJson } from '@/types'
import { FILE_NAMES, MESSAGES } from '@config/constants'

/**
 * Command handler for displaying version information
 */
export const versionCommand = async (): Promise<void> => {
  try {
    const packagePath = path.join(process.cwd(), FILE_NAMES.PACKAGE_JSON)
    const packageContent = await fs.readFile(packagePath, 'utf-8')
    const packageJson: PackageJson = JSON.parse(packageContent)

    console.log(chalk.blue('Package Information:'))
    console.log(chalk.green(`Name: ${packageJson.name}`))
    console.log(chalk.green(`Version: ${packageJson.version}`))

    // Show dependencies versions if they exist
    if (packageJson.dependencies) {
      console.log(chalk.blue('\nDependencies:'))
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        console.log(chalk.green(`  ${name}: ${version}`))
      })
    }

    // Show devDependencies versions if they exist
    if (packageJson.devDependencies) {
      console.log(chalk.blue('\nDev Dependencies:'))
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        console.log(chalk.green(`  ${name}: ${version}`))
      })
    }
  } catch (error) {
    console.error(chalk.red(MESSAGES.ERROR.PACKAGE_JSON_NOT_FOUND), error)
    process.exit(1)
  }
}
