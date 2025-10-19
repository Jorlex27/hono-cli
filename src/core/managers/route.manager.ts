import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'
import { MESSAGES, FILE_NAMES } from '@config/constants'
import { handleError } from '@utils/errors.util'

/**
 * Updates the route manager file with a new module route
 */
export const updateRouteManager = async (
  kebabName: string,
  camelName: string
): Promise<void> => {
  const routeManagerPath = path.join(process.cwd(), FILE_NAMES.ROUTES)

  try {
    let content = await fs.readFile(routeManagerPath, 'utf-8')

    const importStatement = `import { ${camelName}Router } from './modules/${kebabName}'`

    // Add import under the last import statement
    if (!content.includes(importStatement)) {
      content = content.replace(
        /(import.*\n)(?!import)/,
        `$1${importStatement}\n`
      )
    }

    // Add route registration in the setupRoutes function
    const routeToAdd = `  app.route('/${kebabName}', ${camelName}Router)`

    if (!content.includes(routeToAdd)) {
      content = content.replace(
        /(export const setupRoutes = \(app: Hono\) => {)\n([\s\S]*?)(  return app)/,
        `$1\n$2  ${routeToAdd}\n\n$3`
      )
    }

    await fs.writeFile(routeManagerPath, content)
    console.log(chalk.blue(MESSAGES.INFO.UPDATING_ROUTE_MANAGER(kebabName)))
  } catch (error) {
    handleError(error, 'Failed to update route manager')
  }
}

/**
 * Checks if a route already exists in the route manager
 */
export const routeExists = async (moduleName: string): Promise<boolean> => {
  const routeManagerPath = path.join(process.cwd(), FILE_NAMES.ROUTES)

  try {
    const content = await fs.readFile(routeManagerPath, 'utf-8')
    return content.includes(`'/${moduleName}'`)
  } catch {
    return false
  }
}
