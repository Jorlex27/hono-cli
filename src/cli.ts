#!/usr/bin/env node
import { Command } from 'commander'
import { CLI_VERSION, CLI_NAME } from '@config/constants'
import {
    initCommand,
    versionCommand,
    generateModuleCommand,
    generateRouterCommand,
    seedCommand,
    unseedCommand,
    seedAllCommand,
    unseedAllCommand,
    seedRefreshCommand,
    seedStatusCommand,
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

// Seed commands
program
    .command('seed <module>')
    .description('Seed data for a specific module')
    .action(seedCommand)

program
    .command('unseed <module>')
    .description('Remove seeded data for a specific module')
    .action(unseedCommand)

program
    .command('seed:all')
    .description('Seed data for all modules')
    .action(seedAllCommand)

program
    .command('unseed:all')
    .description('Remove seeded data for all modules')
    .action(unseedAllCommand)

program
    .command('seed:refresh [module]')
    .description('Refresh seeds (unseed then seed). If module is specified, only refresh that module')
    .action(seedRefreshCommand)

program
    .command('seed:status')
    .description('Show seeding status for all modules')
    .action(seedStatusCommand)

program.parse(process.argv)
