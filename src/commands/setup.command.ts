import chalk from 'chalk'
import path from 'path'
import fs from 'fs/promises'
import inquirer from 'inquirer'
import { SetupGenerator } from '@/core/generators/setup.generator'
import { handleError } from '@/utils/errors.util'

/**
 * Setup hono-cli structure in existing project
 */
export const setupCommand = async (options: {
  force?: boolean
  dryRun?: boolean
  backup?: boolean
}): Promise<void> => {
  try {
    const projectPath = process.cwd()

    // Check if we're in a valid project
    const packageJsonPath = path.join(projectPath, 'package.json')
    const hasPackageJson = await fs
      .access(packageJsonPath)
      .then(() => true)
      .catch(() => false)

    if (!hasPackageJson) {
      console.error(chalk.red('❌ Error: package.json not found. Are you in a project directory?'))
      process.exit(1)
    }

    console.log(chalk.blue('🔧 Setting up hono-cli structure in your project...'))
    console.log()

    // Check for src directory
    const srcDir = path.join(projectPath, 'src')
    const hasSrcDir = await fs
      .access(srcDir)
      .then(() => true)
      .catch(() => false)

    if (!hasSrcDir) {
      const { createSrc } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createSrc',
          message: 'src/ directory not found. Create it?',
          default: true,
        },
      ])

      if (!createSrc) {
        console.log(chalk.yellow('❌ Setup cancelled.'))
        process.exit(0)
      }
    }

    // Show what will be added
    console.log(chalk.cyan('📋 Files that will be added/updated:'))
    console.log(chalk.white('  • src/shared/controller/'))
    console.log(chalk.white('  • src/shared/service/'))
    console.log(chalk.white('  • src/shared/pagination/'))
    console.log(chalk.white('  • src/shared/query/'))
    console.log(chalk.white('  • src/shared/aggregate/'))
    console.log(chalk.white('  • src/shared/errors/'))
    console.log(chalk.white('  • src/config/'))
    console.log(chalk.white('  • scripts/seed.ts'))
    console.log(chalk.white('  • .env.example'))
    console.log(chalk.white('  • tsconfig.json (path aliases)'))
    console.log(chalk.white('  • package.json (dependencies & scripts)'))
    console.log()

    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry-run mode: No files will be modified'))
      console.log()
      return
    }

    // Ask for confirmation
    if (!options.force) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with setup?',
          default: true,
        },
      ])

      if (!proceed) {
        console.log(chalk.yellow('❌ Setup cancelled.'))
        process.exit(0)
      }
    }

    // Initialize generator
    const generator = new SetupGenerator(projectPath, {
      force: options.force || false,
      backup: options.backup || false,
    })

    // Run setup
    await generator.setup()

    console.log()
    console.log(chalk.green('✨ Setup completed successfully!'))
    console.log()
    console.log(chalk.blue('Next steps:'))
    console.log(chalk.white('  1. Review the generated files'))
    console.log(chalk.white('  2. Update .env with your MongoDB connection string'))
    console.log(chalk.white('  3. Generate your first module: hono-cli g:m <name>'))
    console.log()
  } catch (error) {
    handleError(error, 'Setup failed')
    process.exit(1)
  }
}
