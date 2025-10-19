export const serviceTypesTemplate = `
import { ClientSession, ObjectId } from 'mongodb'
import { PipelineStage } from '../aggregate/types'
import { QueryParams } from '../query/types'

export interface BaseModel {
    _id: ObjectId
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date | null
    createdBy?: ObjectId
    updatedBy?: ObjectId
    deletedBy?: ObjectId
}

export type BaseInput<T extends BaseModel> = Omit<T, '_id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'>

export interface ServiceContext {
    userId?: string
    user?: any
    metadata?: Record<string, any>
    transaction?: ClientSession
}

type SkipQueryParser = Record<keyof Partial<QueryParams>, boolean> & {
    query?: boolean
}

export interface ServiceOptions<T extends BaseModel, U extends BaseInput<T>> {
    collectionName: string

    // Query capabilities
    searchFields?: string[]
    filterFields?: string[]
    filterPrefix?: string
    transformQuery?: (query: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Record<string, any>
    sortFields?: string[]
    includeFields?: string[]
    defaultSort?: Record<string, 1 | -1>

    // Features
    softDelete?: boolean
    maxLimit?: number
    skipQueryParser?: Partial<SkipQueryParser>

    // Lifecycle hooks
    beforeCreate?: (data: U, context?: ServiceContext) => Promise<U> | U
    afterCreate?: (item: T, context?: ServiceContext) => Promise<T> | T
    beforeUpdate?: (id: string, data: Partial<T>, context?: ServiceContext) => Promise<Partial<T>> | Partial<T>
    afterUpdate?: (item: T, context?: ServiceContext) => Promise<T> | T
    beforeDelete?: (id: string, context?: ServiceContext) => Promise<void> | void
    afterDelete?: (id: string, context?: ServiceContext) => Promise<void> | void

    // Access control (optional - disabled by default)
    accessControl?: {
        canRead?: (item: T, context: ServiceContext) => boolean
        canCreate?: (data: any, context: ServiceContext) => boolean
        canUpdate?: (item: T, updates: Partial<T>, context: ServiceContext) => boolean
        canDelete?: (item: T, context: ServiceContext) => boolean
    }

    // Aggregation pipelines
    aggregatePipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
    findAllPipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
    findByIdPipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
}
`