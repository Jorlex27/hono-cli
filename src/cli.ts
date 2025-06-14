#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { initializeProject } from './generators/init.generator'
import { generateModule } from './generators/module.generator'
import { generateRouter } from './generators/router.generator'
import path from 'path'
import fs from 'fs/promises'

const program = new Command()

program
    .version('1.0.7')
    .description('Hono.js project generator');

program
    .command('version')
    .alias('v')
    .description('Check package version')
    .action(async () => {
        try {
            // Read package.json
            const packagePath = path.join(process.cwd(), 'package.json')
            const packageContent = await fs.readFile(packagePath, 'utf-8')
            const packageJson = JSON.parse(packageContent)

            console.log(chalk.blue('Package Information:'))
            console.log(chalk.green(`Name: ${packageJson.name}`))
            console.log(chalk.green(`Version: ${packageJson.version}`))

            // Show dependencies versions if they exist
            if (packageJson.dependencies) {
                console.log(chalk.blue('\nDependencies:'))
                Object.entries(packageJson.dependencies).forEach(([name, version]) => {
                    console.log(chalk.green(`${name}: ${version}`))
                })
            }

            // Show devDependencies versions if they exist
            if (packageJson.devDependencies) {
                console.log(chalk.blue('\nDev Dependencies:'))
                Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
                    console.log(chalk.green(`${name}: ${version}`))
                })
            }
        } catch (error) {
            console.error(chalk.red('Error reading package.json:'), error)
        }
    });

program
    .command('init <projectName>')
    .description('Initialize new Hono.js project')
    .action(async (projectName: string) => {
        try {
            await initializeProject(projectName)
        } catch (error) {
            console.error(chalk.red('Error:', error))
        }
    });

program
    .command('g:m <name>')
    .description('Generate a new module')
    .action(async (name: string) => {
        try {
            await generateModule(name.toLowerCase())
        } catch (error) {
            console.error(chalk.red('Error:', error))
        }
    });

program
    .command('g:r <name>')
    .description('Generate a new router')
    .action(async (name: string) => {
        try {
            await generateRouter(name.toLowerCase())
        } catch (error) {
            console.error(chalk.red('Error:', error))
        }
    })

program.parse(process.argv)