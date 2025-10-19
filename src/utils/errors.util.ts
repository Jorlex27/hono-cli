export class CLIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CLIError'
  }
}

export class ProjectExistsError extends CLIError {
  constructor(projectName: string) {
    super(`Project ${projectName} already exists!`)
    this.name = 'ProjectExistsError'
  }
}

export class ModuleExistsError extends CLIError {
  constructor(moduleName: string) {
    super(`Module ${moduleName} already exists!`)
    this.name = 'ModuleExistsError'
  }
}

export class FileNotFoundError extends CLIError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`)
    this.name = 'FileNotFoundError'
  }
}

export class InvalidNameError extends CLIError {
  constructor(name: string) {
    super(`Invalid name: ${name}`)
    this.name = 'InvalidNameError'
  }
}

export const handleError = (error: unknown, context: string): never => {
  if (error instanceof CLIError) {
    throw error
  }

  if (error instanceof Error) {
    throw new CLIError(`${context}: ${error.message}`)
  }

  throw new CLIError(`${context}: Unknown error occurred`)
}
