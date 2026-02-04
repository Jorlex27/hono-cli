import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { exists, createDirectory, writeFile } from '@utils/file.util'
import { DIRECTORIES, FILE_NAMES } from '@config/constants'
import { generateRouteManagerTemplate } from '@/templates/project.template'
import { generateSeedRunnerTemplate } from '@/templates/seed.template'
import { dbConfig } from '@config/templates/db.config'
import { dbUtil } from '@config/templates/db.utils'
import { tsConfig } from '@config/templates/ts.config'
import { serviceIndexTemplate } from '@config/templates/service'
import { serviceTypesTemplate } from '@config/templates/service/types'
import { envTemplate } from '@config/templates/env'
import { paginationTemplate } from '@config/templates/pagination/pagination'
import { controllerTypesTemplate } from '@config/templates/controller/types'
import { controllerIndexTemplate } from '@config/templates/controller'
import { queryTypesTemplate } from '@config/templates/query/types'
import { queryIndexTemplate } from '@config/templates/query'
import { aggregateTypesTemplate } from '@config/templates/aggregate/types'
import { aggregateBuilderTemplate } from '@config/templates/aggregate/builder'
import { errorsIndexTemplate } from '@config/templates/errors'

interface SetupOptions {
  force: boolean
  backup: boolean
}

interface FileToWrite {
  path: string
  content: string
  description: string
}

/**
 * Generator for setting up hono-cli structure in existing project
 */
export class SetupGenerator {
  private projectPath: string
  private options: SetupOptions
  private backupDir: string

  constructor(projectPath: string, options: SetupOptions) {
    this.projectPath = projectPath
    this.options = options
    this.backupDir = path.join(
      projectPath,
      '.hono-cli-backup',
      new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] +
        '_' +
        new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    )
  }

  /**
   * Main setup method
   */
  async setup(): Promise<void> {
    // Create directory structure
    await this.createDirectories()

    // Write all files
    await this.writeFiles()

    // Update configuration files
    await this.updateConfigFiles()

    console.log(chalk.green('✅ All files created successfully'))
  }

  /**
   * Create directory structure
   */
  private async createDirectories(): Promise<void> {
    console.log(chalk.blue('📁 Creating directory structure...'))

    const dirs = Object.values(DIRECTORIES)

    for (const dir of dirs) {
      const dirPath = path.join(this.projectPath, dir)
      await createDirectory(dirPath)
    }

    console.log(chalk.green('✅ Directories created'))
  }

  /**
   * Write all necessary files
   */
  private async writeFiles(): Promise<void> {
    console.log(chalk.blue('📝 Writing files...'))

    const files: FileToWrite[] = [
      {
        path: 'src/config/db.config.ts',
        content: dbConfig,
        description: 'Database configuration',
      },
      {
        path: 'src/shared/utils/db.util.ts',
        content: dbUtil,
        description: 'Database utilities',
      },
      {
        path: 'src/shared/pagination/index.ts',
        content: paginationTemplate,
        description: 'Pagination utilities',
      },
      {
        path: 'src/shared/service/types.ts',
        content: serviceTypesTemplate,
        description: 'Service types',
      },
      {
        path: 'src/shared/service/index.ts',
        content: serviceIndexTemplate,
        description: 'Base service',
      },
      {
        path: 'src/shared/controller/types.ts',
        content: controllerTypesTemplate,
        description: 'Controller types',
      },
      {
        path: 'src/shared/controller/index.ts',
        content: controllerIndexTemplate,
        description: 'Base controller',
      },
      {
        path: 'src/shared/query/types.ts',
        content: queryTypesTemplate,
        description: 'Query parser types',
      },
      {
        path: 'src/shared/query/index.ts',
        content: queryIndexTemplate,
        description: 'Query parser',
      },
      {
        path: 'src/shared/aggregate/types.ts',
        content: aggregateTypesTemplate,
        description: 'Aggregation types',
      },
      {
        path: 'src/shared/aggregate/index.ts',
        content: aggregateBuilderTemplate,
        description: 'Aggregate builder',
      },
      {
        path: 'src/shared/errors/index.ts',
        content: errorsIndexTemplate,
        description: 'Error handlers',
      },
      {
        path: 'scripts/seed.ts',
        content: generateSeedRunnerTemplate(),
        description: 'Seed runner',
      },
    ]

    for (const file of files) {
      await this.writeFileWithBackup(file)
    }

    // Handle optional files
    await this.writeOptionalFiles()

    console.log(chalk.green('✅ Files written'))
  }

  /**
   * Write optional files (ask user if exists)
   */
  private async writeOptionalFiles(): Promise<void> {
    // .env.example
    const envExamplePath = path.join(this.projectPath, FILE_NAMES.ENV_EXAMPLE)
    const envExampleExists = await exists(envExamplePath)

    if (envExampleExists && !this.options.force) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.env.example already exists. Overwrite?',
          default: false,
        },
      ])

      if (overwrite) {
        await this.writeFileWithBackup({
          path: FILE_NAMES.ENV_EXAMPLE,
          content: envTemplate('my-hono-app'),
          description: 'Environment template',
        })
      } else {
        console.log(chalk.yellow('⏭️  Skipped .env.example'))
      }
    } else {
      await this.writeFileWithBackup({
        path: FILE_NAMES.ENV_EXAMPLE,
        content: envTemplate('my-hono-app'),
        description: 'Environment template',
      })
    }

    // src/routes.ts
    const routesPath = path.join(this.projectPath, FILE_NAMES.ROUTES)
    const routesExists = await exists(routesPath)

    if (routesExists && !this.options.force) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'src/routes.ts already exists. Overwrite?',
          default: false,
        },
      ])

      if (overwrite) {
        await this.writeFileWithBackup({
          path: FILE_NAMES.ROUTES,
          content: generateRouteManagerTemplate(),
          description: 'Route manager',
        })
      } else {
        console.log(chalk.yellow('⏭️  Skipped src/routes.ts'))
      }
    } else {
      await this.writeFileWithBackup({
        path: FILE_NAMES.ROUTES,
        content: generateRouteManagerTemplate(),
        description: 'Route manager',
      })
    }
  }

  /**
   * Write file with backup if exists
   */
  private async writeFileWithBackup(file: FileToWrite): Promise<void> {
    const filePath = path.join(this.projectPath, file.path)
    const fileExists = await exists(filePath)

    if (fileExists) {
      // Backup if option enabled
      if (this.options.backup) {
        await this.backupFile(file.path)
      }

      // Skip if not force mode
      if (!this.options.force) {
        console.log(chalk.yellow(`⏭️  Skipped ${file.path} (already exists)`))
        return
      }
    }

    await writeFile(filePath, file.content)
    console.log(chalk.gray(`  ✓ ${file.description} (${file.path})`))
  }

  /**
   * Backup existing file
   */
  private async backupFile(relativePath: string): Promise<void> {
    const sourcePath = path.join(this.projectPath, relativePath)
    const backupPath = path.join(this.backupDir, relativePath)

    // Create backup directory
    await createDirectory(path.dirname(backupPath))

    // Copy file
    await fs.copyFile(sourcePath, backupPath)
    console.log(chalk.gray(`  💾 Backed up ${relativePath}`))
  }

  /**
   * Update configuration files (tsconfig.json, package.json)
   */
  private async updateConfigFiles(): Promise<void> {
    console.log(chalk.blue('⚙️  Updating configuration files...'))

    // Update tsconfig.json
    await this.updateTsConfig()

    // Update package.json
    await this.updatePackageJson()

    console.log(chalk.green('✅ Configuration updated'))
  }

  /**
   * Update tsconfig.json with path aliases
   */
  private async updateTsConfig(): Promise<void> {
    const tsconfigPath = path.join(this.projectPath, FILE_NAMES.TSCONFIG)
    const tsconfigExists = await exists(tsconfigPath)

    if (!tsconfigExists) {
      // Create new tsconfig.json
      await writeFile(tsconfigPath, JSON.stringify(tsConfig, null, 2))
      console.log(chalk.gray('  ✓ Created tsconfig.json'))
      return
    }

    // Read existing tsconfig.json
    const content = await fs.readFile(tsconfigPath, 'utf-8')
    let tsconfig: any

    try {
      tsconfig = JSON.parse(content)
    } catch (error) {
      console.log(chalk.yellow('  ⚠️  Failed to parse tsconfig.json, skipping...'))
      return
    }

    // Merge path aliases
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {}
    }

    const newPaths = {
      '@/*': ['./src/*'],
      '@config/*': ['./src/config/*'],
      '@shared/*': ['./src/shared/*'],
      '@modules/*': ['./src/modules/*'],
    }

    tsconfig.compilerOptions.paths = {
      ...tsconfig.compilerOptions.paths,
      ...newPaths,
    }

    // Ensure baseUrl is set
    if (!tsconfig.compilerOptions.baseUrl) {
      tsconfig.compilerOptions.baseUrl = '.'
    }

    // Backup if option enabled
    if (this.options.backup && tsconfigExists) {
      await this.backupFile(FILE_NAMES.TSCONFIG)
    }

    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2))
    console.log(chalk.gray('  ✓ Updated tsconfig.json with path aliases'))
  }

  /**
   * Update package.json with dependencies and scripts
   */
  private async updatePackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.projectPath, FILE_NAMES.PACKAGE_JSON)
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    // Add dependencies
    if (!packageJson.dependencies) {
      packageJson.dependencies = {}
    }

    const requiredDeps = {
      hono: 'latest',
      mongodb: 'latest',
      zod: 'latest',
    }

    let depsAdded = false
    for (const [dep, version] of Object.entries(requiredDeps)) {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = version
        depsAdded = true
      }
    }

    // Add dev dependencies
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {}
    }

    const requiredDevDeps = {
      '@types/bun': 'latest',
      '@types/mongodb': 'latest',
    }

    for (const [dep, version] of Object.entries(requiredDevDeps)) {
      if (!packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = version
        depsAdded = true
      }
    }

    // Add scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }

    const requiredScripts = {
      seed: 'bun run scripts/seed.ts',
    }

    let scriptsAdded = false
    for (const [script, command] of Object.entries(requiredScripts)) {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command
        scriptsAdded = true
      }
    }

    // Backup if option enabled
    if (this.options.backup) {
      await this.backupFile(FILE_NAMES.PACKAGE_JSON)
    }

    // Write updated package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

    if (depsAdded) {
      console.log(chalk.gray('  ✓ Added missing dependencies to package.json'))
    }
    if (scriptsAdded) {
      console.log(chalk.gray('  ✓ Added scripts to package.json'))
    }

    if (depsAdded) {
      console.log(chalk.yellow('\n⚠️  Please run: bun install'))
    }
  }
}
