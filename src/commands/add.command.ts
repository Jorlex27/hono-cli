import chalk from 'chalk'
import path from 'path'
import fs from 'fs/promises'
import { generateSeedRunnerTemplate } from '@/templates/seed.template'

/**
 * Add seed system to existing project
 */
export const addSeedCommand = async (): Promise<void> => {
  try {
    const projectPath = process.cwd()

    // Check if we're in a valid project (has package.json)
    const packageJsonPath = path.join(projectPath, 'package.json')
    const hasPackageJson = await fs
      .access(packageJsonPath)
      .then(() => true)
      .catch(() => false)

    if (!hasPackageJson) {
      console.error(chalk.red('❌ Error: package.json not found. Are you in a project directory?'))
      process.exit(1)
    }

    console.log(chalk.blue('📦 Adding seed system to your project...'))
    console.log()

    // Create scripts directory if not exists
    const scriptsDir = path.join(projectPath, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })

    // Create seed.ts file
    const seedFilePath = path.join(scriptsDir, 'seed.ts')
    const seedFileExists = await fs
      .access(seedFilePath)
      .then(() => true)
      .catch(() => false)

    if (seedFileExists) {
      console.log(chalk.yellow('⚠️  scripts/seed.ts already exists, skipping...'))
    } else {
      await fs.writeFile(seedFilePath, generateSeedRunnerTemplate())
      console.log(chalk.green('✅ Created scripts/seed.ts'))
    }

    // Update package.json with seed script
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)

    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }

    if (packageJson.scripts.seed) {
      console.log(chalk.yellow('⚠️  "seed" script already exists in package.json, skipping...'))
    } else {
      packageJson.scripts.seed = 'bun run scripts/seed.ts'
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
      console.log(chalk.green('✅ Added "seed" script to package.json'))
    }

    console.log()
    console.log(chalk.green('✨ Seed system added successfully!'))
    console.log()
    console.log(chalk.blue('Usage:'))
    console.log(chalk.white('  bun seed seed <module>        - Seed a specific module'))
    console.log(chalk.white('  bun seed unseed <module>      - Unseed a specific module'))
    console.log(chalk.white('  bun seed seed:all             - Seed all modules'))
    console.log(chalk.white('  bun seed unseed:all           - Unseed all modules'))
    console.log(chalk.white('  bun seed seed:refresh [module] - Refresh seeds'))
    console.log(chalk.white('  bun seed seed:status          - Show available seeders'))
    console.log()
  } catch (error) {
    console.error(chalk.red('Error:'), error)
    process.exit(1)
  }
}
