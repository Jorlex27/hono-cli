export const serviceTypesTemplate = `
import { ObjectId } from 'mongodb'

export interface BaseModel {
    _id: ObjectId
    createdAt: Date
    updatedAt: Date
}

export interface BaseInput {
    [key: string]: any
}

export type CustomFinder<T> = Record<string, (...args: any[]) => Promise<T | T[] | string | null>>

export interface ServiceOptions<T extends BaseModel, U extends BaseInput> {
    collectionName: string
    aggregatePipeline?: (options?: Record<string, any>) => Promise<any[]> | any[]
    findAllPipeline?: (options?: Record<string, any>) => Promise<any[]> | any[]
    findByIdPipeline?: (options?: Record<string, any>) => Promise<any[]> | any[]
    beforeCreate?: (data: U) => Promise<U>
    afterCreate?: (data: T) => Promise<T>
    beforeUpdate?: (id: string, data: Partial<T>) => Promise<Partial<T>>
    afterUpdate?: (data: T) => Promise<T>
}
`