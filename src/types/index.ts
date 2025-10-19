export interface ModuleFile {
  filename: string
  content: string
}

export interface ProjectConfig {
  name: string
  path: string
}

export interface GeneratorOptions {
  name: string
  pascalName: string
  camelName: string
  kebabName: string
  upperName: string
}

export interface PackageJson {
  name: string
  version: string
  type?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

export interface CommandContext {
  cwd: string
  projectName?: string
}

export type CaseType = 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant'
