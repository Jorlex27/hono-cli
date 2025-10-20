import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { DIRECTORIES } from '@config/constants'

interface SeederInfo {
  name: string
  kebabName: string
  pascalName: string
  camelName: string
  filePath: string
  hasSeeder: boolean
}

interface SeederStatus {
  module: string
  seeded: boolean
  count: number
}

export class SeederManager {
  private seeders: Map<string, any> = new Map()
  private seededData: Map<string, string[]> = new Map()

  /**
   * Discover all available seeders from modules directory
   */
  async discoverSeeders(): Promise<SeederInfo[]> {
    const modulesPath = path.join(process.cwd(), DIRECTORIES.MODULES)

    try {
      const modules = await fs.readdir(modulesPath)
      const seeders: SeederInfo[] = []

      for (const moduleName of modules) {
        const moduleDir = path.join(modulesPath, moduleName)
        const stat = await fs.stat(moduleDir)

        if (!stat.isDirectory()) continue

        const seederFile = path.join(moduleDir, `${moduleName}.seed.ts`)
        const hasSeeder = await fs
          .access(seederFile)
          .then(() => true)
          .catch(() => false)

        if (hasSeeder) {
          // Generate case variations
          const pascalName = moduleName
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('')

          const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1)

          seeders.push({
            name: moduleName,
            kebabName: moduleName,
            pascalName,
            camelName,
            filePath: seederFile,
            hasSeeder: true,
          })
        }
      }

      return seeders
    } catch (error) {
      console.error(chalk.red('Error discovering seeders:'), error)
      return []
    }
  }

  /**
   * Load a specific seeder
   */
  async loadSeeder(moduleName: string): Promise<any> {
    if (this.seeders.has(moduleName)) {
      return this.seeders.get(moduleName)
    }

    const seeders = await this.discoverSeeders()
    const seederInfo = seeders.find(s => s.kebabName === moduleName)

    if (!seederInfo) {
      throw new Error(`Seeder not found for module: ${moduleName}`)
    }

    try {
      // Dynamic import the seeder
      const seederModule = await import(seederInfo.filePath)
      const SeederClass = seederModule[`${seederInfo.pascalName}Seeder`]

      if (!SeederClass) {
        throw new Error(`Seeder class not exported: ${seederInfo.pascalName}Seeder`)
      }

      // Import the service
      const serviceFile = path.join(
        path.dirname(seederInfo.filePath),
        `${seederInfo.kebabName}.service.ts`
      )
      const serviceModule = await import(serviceFile)
      const service = serviceModule[`${seederInfo.camelName}Service`]

      if (!service) {
        throw new Error(`Service not found: ${seederInfo.camelName}Service`)
      }

      // Instantiate seeder with service
      const seeder = new SeederClass(service)

      // Restore seeded IDs if available
      const seededIds = this.seededData.get(moduleName)
      if (seededIds && seeder.setSeededIds) {
        seeder.setSeededIds(seededIds)
      }

      this.seeders.set(moduleName, seeder)
      return seeder
    } catch (error) {
      throw new Error(`Failed to load seeder for ${moduleName}: ${error}`)
    }
  }

  /**
   * Seed a specific module
   */
  async seed(moduleName: string): Promise<void> {
    try {
      const seeder = await this.loadSeeder(moduleName)
      const seededIds = await seeder.seed()

      // Store seeded IDs for later unseed
      if (seededIds && seededIds.length > 0) {
        this.seededData.set(moduleName, seededIds)
      }
    } catch (error) {
      console.error(chalk.red(`Failed to seed ${moduleName}:`), error)
      throw error
    }
  }

  /**
   * Unseed a specific module
   */
  async unseed(moduleName: string): Promise<void> {
    try {
      const seeder = await this.loadSeeder(moduleName)
      await seeder.unseed()

      // Clear seeded data
      this.seededData.delete(moduleName)
    } catch (error) {
      console.error(chalk.red(`Failed to unseed ${moduleName}:`), error)
      throw error
    }
  }

  /**
   * Seed all modules
   */
  async seedAll(): Promise<void> {
    console.log(chalk.blue('🌱 Seeding all modules...'))
    console.log()

    const seeders = await this.discoverSeeders()

    if (seeders.length === 0) {
      console.log(chalk.yellow('⚠️  No seeders found'))
      return
    }

    let successCount = 0
    let failCount = 0

    for (const seederInfo of seeders) {
      try {
        await this.seed(seederInfo.kebabName)
        successCount++
      } catch (error) {
        failCount++
      }
    }

    console.log()
    console.log(chalk.green(`✅ Successfully seeded ${successCount} module(s)`))
    if (failCount > 0) {
      console.log(chalk.red(`❌ Failed to seed ${failCount} module(s)`))
    }
  }

  /**
   * Unseed all modules
   */
  async unseedAll(): Promise<void> {
    console.log(chalk.blue('🗑️  Unseeding all modules...'))
    console.log()

    const seeders = await this.discoverSeeders()

    if (seeders.length === 0) {
      console.log(chalk.yellow('⚠️  No seeders found'))
      return
    }

    let successCount = 0
    let failCount = 0

    // Unseed in reverse order
    for (let i = seeders.length - 1; i >= 0; i--) {
      const seederInfo = seeders[i]
      if (!seederInfo) continue

      try {
        await this.unseed(seederInfo.kebabName)
        successCount++
      } catch (error) {
        failCount++
      }
    }

    console.log()
    console.log(chalk.green(`✅ Successfully unseeded ${successCount} module(s)`))
    if (failCount > 0) {
      console.log(chalk.red(`❌ Failed to unseed ${failCount} module(s)`))
    }
  }

  /**
   * Refresh seeds (unseed then seed)
   */
  async refresh(moduleName?: string): Promise<void> {
    if (moduleName) {
      console.log(chalk.blue(`🔄 Refreshing ${moduleName}...`))
      console.log()
      await this.unseed(moduleName)
      await this.seed(moduleName)
    } else {
      console.log(chalk.blue('🔄 Refreshing all modules...'))
      console.log()
      await this.unseedAll()
      await this.seedAll()
    }
  }

  /**
   * Get status of all seeders
   */
  async getStatus(): Promise<SeederStatus[]> {
    const seeders = await this.discoverSeeders()
    const statuses: SeederStatus[] = []

    for (const seederInfo of seeders) {
      const seededIds = this.seededData.get(seederInfo.kebabName) || []
      statuses.push({
        module: seederInfo.kebabName,
        seeded: seededIds.length > 0,
        count: seededIds.length,
      })
    }

    return statuses
  }

  /**
   * Display status in console
   */
  async displayStatus(): Promise<void> {
    console.log(chalk.blue('📊 Seeder Status'))
    console.log()

    const statuses = await this.getStatus()

    if (statuses.length === 0) {
      console.log(chalk.yellow('⚠️  No seeders found'))
      return
    }

    console.log(chalk.bold('Module'.padEnd(30) + 'Status'.padEnd(15) + 'Count'))
    console.log('─'.repeat(50))

    for (const status of statuses) {
      const statusIcon = status.seeded ? chalk.green('✓ Seeded') : chalk.gray('○ Not seeded')
      const count = status.seeded ? chalk.cyan(status.count.toString()) : chalk.gray('0')

      console.log(
        status.module.padEnd(30) +
        statusIcon.padEnd(15) +
        count
      )
    }

    console.log()
    const totalSeeded = statuses.filter(s => s.seeded).length
    const totalCount = statuses.reduce((sum, s) => sum + s.count, 0)
    console.log(chalk.green(`Total: ${totalSeeded}/${statuses.length} modules seeded (${totalCount} items)`))
  }
}

// Export singleton instance
export const seederManager = new SeederManager()
