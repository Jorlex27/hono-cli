#!/usr/bin/env node
import { Command } from 'commander'
import { CLI_VERSION, CLI_NAME } from '@config/constants'
import {
    initCommand,
    versionCommand,
    generateModuleCommand,
    generateRouterCommand,
    addSeedCommand,
} from '@/commands'

const program = new Command()

program
    .name(CLI_NAME)
    .version(CLI_VERSION)
    .description('Hono.js project generator')

program
    .command('version')
    .alias('v')
    .description('Check package version')
    .action(versionCommand)

program
    .command('init <projectName>')
    .description('Initialize new Hono.js project')
    .action(initCommand)

program
    .command('g:m <name>')
    .description('Generate a new module')
    .action(generateModuleCommand)

program
    .command('g:r <name>')
    .description('Generate a new router')
    .action(generateRouterCommand)

program
    .command('add:seed')
    .description('Add seed system to existing project')
    .action(addSeedCommand)

program.parse(process.argv)
