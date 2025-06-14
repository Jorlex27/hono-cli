import fs from 'fs/promises'
import path from 'path'

export const exists = async (path: string) => {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

export const createDirectory = async (dir: string) => {
    await fs.mkdir(dir, { recursive: true })
}

export const writeFile = async (filePath: string, content: string) => {
    await fs.writeFile(filePath, content)
}

export const readFile = async (filePath: string) => {
    return await fs.readFile(filePath, 'utf-8')
}