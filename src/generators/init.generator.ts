import path from 'path'
import chalk from 'chalk'
import { exists, createDirectory, writeFile } from '@utils/file.util'
import { generateIndexTs, generateRouteManagerTemplate } from '@templates/project.template'
import { execSync } from 'child_process'
import fs from 'fs/promises'
import { dbConfig } from './config/db.config'
import { dbUtil } from './config/db.utils'
import { tsConfig } from './config/ts.config'
import { serviceIndexTemplate } from './config/service'
import { serviceTypesTemplate } from './config/service/types'
import { envTemplate } from './env'
import { paginationTemplate } from './config/pagination/pagination'
import { controllerTypesTemplate } from './config/controller/types'
import { controllerIndexTemplate } from './config/controller'

export const initializeProject = async (projectName: string) => {
    const projectPath = path.join(process.cwd(), projectName)
    const isExisting = await exists(projectPath)

    if (isExisting) {
        console.log(chalk.yellow(`Project ${projectName} already exists!`))
        return
    }

    try {
        await createDirectory(projectPath)

        process.chdir(projectPath)

        console.log(chalk.blue('Initializing Bun project...'))
        execSync('bun init -y', { stdio: 'inherit' })

        const filesToRemove = ['index.ts', 'README.md', '.gitignore', 'tsconfig.json']
        for (const file of filesToRemove) {
            await fs.unlink(file).catch(() => { })
        }

        console.log(chalk.blue('Installing dependencies...'))
        execSync('bun add hono @hono/swagger-ui zod mongodb', {
            stdio: 'inherit'
        })
        execSync('bun add -d @types/mongodb', {
            stdio: 'inherit'
        })

        console.log(chalk.green('✨ Dependencies installed successfully!'))

        const dirs = [
            'src/modules',
            'src/shared/middleware',
            'src/shared/utils',
            'src/shared/service',
            'src/shared/controller',
            'src/shared/pagination',
            'src/config'
        ]

        for (const dir of dirs) {
            await createDirectory(dir)
        }

        // Write all config files
        await writeFile(
            path.join(projectPath, 'src/config/db.config.ts'),
            dbConfig
        )
        
        await writeFile(
            path.join(projectPath, 'src/shared/utils/db.util.ts'),
            dbUtil
        )
        
        // Write all shared files
        await writeFile(
            path.join(projectPath, 'src/shared/pagination/index.ts'),
            paginationTemplate
        )
        
        await writeFile(
            path.join(projectPath, 'src/shared/service/types.ts'),
            serviceTypesTemplate
        )

        await writeFile(
            path.join(projectPath, 'src/shared/service/index.ts'),
            serviceIndexTemplate
        )
        
        await writeFile(
            path.join(projectPath, 'src/shared/controller/types.ts'),
            controllerTypesTemplate
        )

        await writeFile(
            path.join(projectPath, 'src/shared/controller/index.ts'),
            controllerIndexTemplate
        )

        await writeFile(
            path.join(projectPath, 'tsconfig.json'),
            JSON.stringify(tsConfig, null, 2)
        )

        await writeFile(
            path.join(projectPath, '.env.example'),
            envTemplate(projectName)
        )

        await writeFile(
            path.join(projectPath, '.env'),
            envTemplate(projectName)
        )

        await writeFile(
            path.join(projectPath, 'src/index.ts'),
            generateIndexTs(projectName)
        )

        await writeFile(
            path.join(projectPath, 'src/routes.ts'),
            generateRouteManagerTemplate()
        )

        await writeFile(
            path.join(projectPath, 'README.md'),
            `# ${projectName}\n\Hono.js project generated with hono-cli\n`
        )

        await writeFile(
            path.join(projectPath, '.gitignore'),
            `node_modules/\n.env\ndist/\n.DS_Store\n/\n.env`
        )

        const packageJson = {
            name: projectName,
            version: '1.0.0',
            type: "module",
            scripts: {
                dev: 'bun run --watch src/index.ts',
                start: 'bun run src/index.ts',
                build: "bun build ./src/cli.ts --outdir ./dist --target node",
            },
            dependencies: {
                hono: 'latest',
                '@hono/swagger-ui': 'latest',
                'mongodb': 'latest',
                'zod': 'latest'
            },
            devDependencies: {
                "@types/bun": "latest",
                '@types/mongodb': 'latest'
            }
        }

        await writeFile(
            path.join(projectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        )

        console.log(chalk.green(`✨ Project ${projectName} initialized successfully!`))
        console.log(chalk.blue(`\nTo get started:`))
        console.log(chalk.white(`  cd ${projectName}`))
        console.log(chalk.white(`  bun run dev\n`))
    } catch (error) {
        console.error(chalk.red('Error initializing project:'), error)
        throw error
    }
}