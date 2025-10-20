export const generateSeedRunnerTemplate = () => `#!/usr/bin/env bun
import { db } from '@shared/utils/db.util'
import fs from 'fs/promises'
import path from 'path'

interface SeederInfo {
  name: string
  path: string
}

class SeedRunner {
  private seedersCache: Map<string, any> = new Map()

  async discoverSeeders(): Promise<SeederInfo[]> {
    const modulesPath = path.join(process.cwd(), 'src/modules')
    const seeders: SeederInfo[] = []

    try {
      const modules = await fs.readdir(modulesPath)

      for (const moduleName of modules) {
        const moduleDir = path.join(modulesPath, moduleName)
        const stat = await fs.stat(moduleDir)

        if (!stat.isDirectory()) continue

        const seederFile = path.join(moduleDir, \`\${moduleName}.seed.ts\`)
        const hasSeeder = await fs
          .access(seederFile)
          .then(() => true)
          .catch(() => false)

        if (hasSeeder) {
          seeders.push({
            name: moduleName,
            path: seederFile,
          })
        }
      }

      return seeders
    } catch (error) {
      console.error('Error discovering seeders:', error)
      return []
    }
  }

  async loadSeeder(moduleName: string) {
    if (this.seedersCache.has(moduleName)) {
      return this.seedersCache.get(moduleName)
    }

    const seeders = await this.discoverSeeders()
    const seederInfo = seeders.find(s => s.name === moduleName)

    if (!seederInfo) {
      throw new Error(\`Seeder not found for module: \${moduleName}\`)
    }

    try {
      const seederModule = await import(seederInfo.path)
      const pascalName = moduleName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

      const SeederClass = seederModule[\`\${pascalName}Seeder\`]

      if (!SeederClass) {
        throw new Error(\`Seeder class not exported: \${pascalName}Seeder\`)
      }

      const serviceFile = path.join(path.dirname(seederInfo.path), \`\${moduleName}.service.ts\`)
      const serviceModule = await import(serviceFile)
      const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1)
      const service = serviceModule[\`\${camelName}Service\`]

      if (!service) {
        throw new Error(\`Service not found: \${camelName}Service\`)
      }

      const seeder = new SeederClass(service)
      this.seedersCache.set(moduleName, seeder)
      return seeder
    } catch (error) {
      throw new Error(\`Failed to load seeder for \${moduleName}: \${error}\`)
    }
  }

  async seed(moduleName: string) {
    try {
      const seeder = await this.loadSeeder(moduleName)
      await seeder.seed()
    } catch (error) {
      console.error(\`Failed to seed \${moduleName}:\`, error)
      throw error
    }
  }

  async unseed(moduleName: string) {
    try {
      const seeder = await this.loadSeeder(moduleName)
      await seeder.unseed()
    } catch (error) {
      console.error(\`Failed to unseed \${moduleName}:\`, error)
      throw error
    }
  }

  async seedAll() {
    console.log('🌱 Seeding all modules...')
    console.log()

    const seeders = await this.discoverSeeders()

    if (seeders.length === 0) {
      console.log('⚠️  No seeders found')
      return
    }

    let successCount = 0
    let failCount = 0

    for (const seederInfo of seeders) {
      try {
        await this.seed(seederInfo.name)
        successCount++
      } catch (error) {
        failCount++
      }
    }

    console.log()
    console.log(\`✅ Successfully seeded \${successCount} module(s)\`)
    if (failCount > 0) {
      console.log(\`❌ Failed to seed \${failCount} module(s)\`)
    }
  }

  async unseedAll() {
    console.log('🗑️  Unseeding all modules...')
    console.log()

    const seeders = await this.discoverSeeders()

    if (seeders.length === 0) {
      console.log('⚠️  No seeders found')
      return
    }

    let successCount = 0
    let failCount = 0

    for (let i = seeders.length - 1; i >= 0; i--) {
      const seederInfo = seeders[i]
      if (!seederInfo) continue

      try {
        await this.unseed(seederInfo.name)
        successCount++
      } catch (error) {
        failCount++
      }
    }

    console.log()
    console.log(\`✅ Successfully unseeded \${successCount} module(s)\`)
    if (failCount > 0) {
      console.log(\`❌ Failed to unseed \${failCount} module(s)\`)
    }
  }

  async refresh(moduleName?: string) {
    if (moduleName) {
      console.log(\`🔄 Refreshing \${moduleName}...\`)
      console.log()
      await this.unseed(moduleName)
      await this.seed(moduleName)
      console.log()
      console.log(\`✅ Successfully refreshed \${moduleName}\`)
    } else {
      console.log('🔄 Refreshing all modules...')
      console.log()
      await this.unseedAll()
      await this.seedAll()
      console.log()
      console.log('✅ Successfully refreshed all modules')
    }
  }

  async status() {
    console.log('📊 Seeder Status')
    console.log()

    const seeders = await this.discoverSeeders()

    if (seeders.length === 0) {
      console.log('⚠️  No seeders found')
      return
    }

    console.log('Module'.padEnd(30) + 'Status')
    console.log('─'.repeat(50))

    for (const seeder of seeders) {
      console.log(seeder.name.padEnd(30) + '✓ Available')
    }

    console.log()
    console.log(\`Total: \${seeders.length} seeder(s) available\`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const moduleName = args[1]

  // Connect to database
  try {
    await db.connect()
    console.log('📦 Database connected')
    console.log()
  } catch (error) {
    console.error('❌ Database connection error:', error)
    process.exit(1)
  }

  const runner = new SeedRunner()

  try {
    switch (command) {
      case 'seed':
        if (!moduleName) {
          console.error('❌ Module name required: bun seed seed <module>')
          process.exit(1)
        }
        await runner.seed(moduleName)
        break

      case 'unseed':
        if (!moduleName) {
          console.error('❌ Module name required: bun seed unseed <module>')
          process.exit(1)
        }
        await runner.unseed(moduleName)
        break

      case 'seed:all':
        await runner.seedAll()
        break

      case 'unseed:all':
        await runner.unseedAll()
        break

      case 'seed:refresh':
        await runner.refresh(moduleName)
        break

      case 'seed:status':
        await runner.status()
        break

      default:
        console.log('Usage:')
        console.log('  bun seed seed <module>        - Seed a specific module')
        console.log('  bun seed unseed <module>      - Unseed a specific module')
        console.log('  bun seed seed:all             - Seed all modules')
        console.log('  bun seed unseed:all           - Unseed all modules')
        console.log('  bun seed seed:refresh [module] - Refresh seeds')
        console.log('  bun seed seed:status          - Show available seeders')
        process.exit(1)
    }

    await db.disconnect()
    console.log()
    console.log('✅ Done')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await db.disconnect()
    process.exit(1)
  }
}

main()
`
