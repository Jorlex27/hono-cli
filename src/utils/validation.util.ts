import { InvalidNameError } from './errors.util'

/**
 * Validates project or module name
 */
export const validateName = (name: string): void => {
  if (!name || name.trim().length === 0) {
    throw new InvalidNameError('Name cannot be empty')
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new InvalidNameError(
      'Name can only contain letters, numbers, hyphens, and underscores'
    )
  }

  if (name.startsWith('-') || name.startsWith('_')) {
    throw new InvalidNameError('Name cannot start with a hyphen or underscore')
  }
}

/**
 * Validates if a path is safe to use
 */
export const validatePath = (path: string): boolean => {
  // Prevent path traversal attacks
  if (path.includes('..') || path.includes('~')) {
    return false
  }

  return true
}
