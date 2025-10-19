/**
 * Text transformation utilities for string case conversions
 */

export const toCamelCase = (str: string): string => {
  if (!str) return ''

  const words = str.split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return ''

  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

export const toPascalCase = (str: string): string => {
  if (!str) return ''

  const words = str.split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return ''

  return words
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

export const toKebabCase = (str: string): string => {
  if (!str) return ''

  const words = str.split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return ''

  return words
    .join('-')
    .toLowerCase()
}

export const toSnakeCase = (str: string): string => {
  if (!str) return ''
  return str.split(/[-_\s]+/).filter(Boolean).join('_').toLowerCase()
}

export const toConstantCase = (str: string): string => {
  if (!str) return ''
  return str.split(/[-_\s]+/).filter(Boolean).join('_').toUpperCase()
}

export const toTitleCase = (str: string): string => {
  if (!str) return ''
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })
}

export const toProperCase = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .replace(/\s+/g, '')
}

export const toUpperCase = (name: string): string =>
  name.toUpperCase().replace(/-/g, '_')

export const pluralize = (str: string): string => {
  if (!str) return ''

  const words = str.split(/[-_\s]+/).filter(Boolean)
  if (words.length === 0) return ''

  const lastWord = words[words.length - 1]

  const irregulars: Record<string, string> = {
    person: 'people',
    child: 'children',
    foot: 'feet',
    tooth: 'teeth',
    mouse: 'mice',
    criterion: 'criteria',
    analysis: 'analyses',
    datum: 'data',
    index: 'indices',
    matrix: 'matrices',
    vertex: 'vertices',
    status: 'statuses'
  }

  if (!lastWord) return str

  const lastWordLower = lastWord.toLowerCase()

  let pluralizedLastWord: string

  // Check for irregular plurals first
  if (irregulars[lastWordLower]) {
    pluralizedLastWord = irregulars[lastWordLower]
  } else if (lastWordLower.endsWith('s') &&
    (lastWordLower.endsWith('ss') ||
      lastWordLower.endsWith('us') ||
      lastWordLower.endsWith('is'))) {
    pluralizedLastWord = lastWord
  } else if (lastWordLower.endsWith('y')) {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u'])
    const beforeY = lastWordLower[lastWordLower.length - 2]
    pluralizedLastWord = vowels.has(beforeY as string)
      ? `${lastWord}s`
      : `${lastWord.slice(0, -1)}ies`
  } else if (lastWordLower.endsWith('s') ||
    lastWordLower.endsWith('sh') ||
    lastWordLower.endsWith('ch') ||
    lastWordLower.endsWith('x') ||
    lastWordLower.endsWith('z')) {
    pluralizedLastWord = `${lastWord}es`
  } else if (lastWordLower.endsWith('fe')) {
    pluralizedLastWord = `${lastWord.slice(0, -2)}ves`
  } else if (lastWordLower.endsWith('f')) {
    pluralizedLastWord = `${lastWord.slice(0, -1)}ves`
  } else {
    const oExceptions = new Set(['photo', 'piano', 'memo'])
    if (lastWordLower.endsWith('o') && !oExceptions.has(lastWordLower)) {
      pluralizedLastWord = `${lastWord}es`
    } else {
      pluralizedLastWord = `${lastWord}s`
    }
  }

  words[words.length - 1] = pluralizedLastWord
  return words.join('-')
}

/**
 * Generate all case variations for a given name
 */
export const generateCaseVariations = (name: string) => ({
  kebab: toKebabCase(name),
  pascal: toPascalCase(name),
  camel: toCamelCase(name),
  upper: toConstantCase(name),
  snake: toSnakeCase(name),
})
