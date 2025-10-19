import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { exists, createDirectory, writeFile } from '@utils/file.util'
import { validateName } from '@utils/validation.util'
import { ProjectExistsError, handleError } from '@utils/errors.util'
import {
  DIRECTORIES,
  FILE_NAMES,
  DEPENDENCIES,
  MESSAGES,
  CLI_NAME,
} from '@config/constants'
import { generateIndexTs, generateRouteManagerTemplate } from '@/templates/project.template'
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
import { errorsIndexTemplate } from '@config/templates/errors'

/**
 * Initializes a new Hono.js project with the CLI structure
 */
export const initializeProject = async (projectName: string): Promise<void> => {
  try {
    validateName(projectName)

    const projectPath = path.join(process.cwd(), projectName)
    const isExisting = await exists(projectPath)

    if (isExisting) {
      throw new ProjectExistsError(projectName)
    }

    await createDirectory(projectPath)
    process.chdir(projectPath)

    // Initialize Bun project
    console.log(chalk.blue(MESSAGES.INFO.INITIALIZING_PROJECT))
    execSync('bun init -y', { stdio: 'inherit' })

    // Clean up default files
    await cleanupDefaultFiles()

    // Install dependencies
    await installDependencies()

    // Create directory structure
    await createProjectStructure(projectPath)

    // Write all config and shared files
    await writeConfigFiles(projectPath)

    // Write main application files
    await writeMainFiles(projectPath, projectName)

    // Update package.json
    await updatePackageJson(projectPath, projectName)

    console.log(chalk.green(MESSAGES.SUCCESS.PROJECT_INITIALIZED(projectName)))
    console.log(chalk.blue('\nTo get started:'))
    console.log(chalk.white(`  cd ${projectName}`))
    console.log(chalk.white('  bun run dev\n'))
  } catch (error) {
    if (error instanceof ProjectExistsError) {
      console.log(chalk.yellow(error.message))
      return
    }
    handleError(error, MESSAGES.ERROR.INITIALIZATION_FAILED)
  }
}

/**
 * Removes default files created by bun init
 */
const cleanupDefaultFiles = async (): Promise<void> => {
  const filesToRemove = ['index.ts', 'README.md', '.gitignore', 'tsconfig.json']

  for (const file of filesToRemove) {
    await fs.unlink(file).catch(() => {})
  }
}

/**
 * Installs project dependencies
 */
const installDependencies = async (): Promise<void> => {
  console.log(chalk.blue(MESSAGES.INFO.INSTALLING_DEPENDENCIES))

  execSync(`bun add ${DEPENDENCIES.PRODUCTION.join(' ')}`, { stdio: 'inherit' })
  execSync(`bun add -d ${DEPENDENCIES.DEVELOPMENT.join(' ')}`, { stdio: 'inherit' })

  console.log(chalk.green(MESSAGES.SUCCESS.DEPENDENCIES_INSTALLED))
}

/**
 * Creates the project directory structure
 */
const createProjectStructure = async (projectPath: string): Promise<void> => {
  const dirs = Object.values(DIRECTORIES)

  for (const dir of dirs) {
    await createDirectory(path.join(projectPath, dir))
  }
}

/**
 * Writes all config and shared files
 */
const writeConfigFiles = async (projectPath: string): Promise<void> => {
  const configFiles = [
    { path: 'src/config/db.config.ts', content: dbConfig },
    { path: 'src/shared/utils/db.util.ts', content: dbUtil },
    { path: 'src/shared/pagination/index.ts', content: paginationTemplate },
    { path: 'src/shared/service/types.ts', content: serviceTypesTemplate },
    { path: 'src/shared/service/index.ts', content: serviceIndexTemplate },
    { path: 'src/shared/controller/types.ts', content: controllerTypesTemplate },
    { path: 'src/shared/controller/index.ts', content: controllerIndexTemplate },
    { path: 'src/shared/query/types.ts', content: queryTypesTemplate },
    { path: 'src/shared/query/index.ts', content: queryIndexTemplate },
    { path: 'src/shared/aggregate/types.ts', content: aggregateTypesTemplate },
    { path: 'src/shared/errors/index.ts', content: errorsIndexTemplate },
  ]

  for (const file of configFiles) {
    await writeFile(path.join(projectPath, file.path), file.content)
  }
}

/**
 * Writes main application files
 */
const writeMainFiles = async (
  projectPath: string,
  projectName: string
): Promise<void> => {
  await writeFile(
    path.join(projectPath, FILE_NAMES.TSCONFIG),
    JSON.stringify(tsConfig, null, 2)
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.ENV_EXAMPLE),
    envTemplate(projectName)
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.ENV),
    envTemplate(projectName)
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.INDEX),
    generateIndexTs(projectName)
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.ROUTES),
    generateRouteManagerTemplate()
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.README),
    `# ${projectName}\n\nHono.js project generated with ${CLI_NAME}\n`
  )

  await writeFile(
    path.join(projectPath, FILE_NAMES.GITIGNORE),
    'node_modules/\n.env\ndist/\n.DS_Store\n'
  )
}

/**
 * Updates package.json with project-specific configuration
 */
const updatePackageJson = async (
  projectPath: string,
  projectName: string
): Promise<void> => {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'bun run --watch src/index.ts',
      start: 'bun run src/index.ts',
      build: 'bun build ./src/cli.ts --outdir ./dist --target node',
    },
    dependencies: {
      hono: 'latest',
      '@hono/swagger-ui': 'latest',
      mongodb: 'latest',
      zod: 'latest',
    },
    devDependencies: {
      '@types/bun': 'latest',
      '@types/mongodb': 'latest',
    },
  }

  await writeFile(
    path.join(projectPath, FILE_NAMES.PACKAGE_JSON),
    JSON.stringify(packageJson, null, 2)
  )
}
