export const serviceTypesTemplate = `
import { ClientSession, ObjectId } from 'mongodb'
import { LookupOptions, PipelineStage } from '../aggregate/types'
import { QueryParams } from '../query/types'

// MongoDB Filter Types
type Primitive = string | number | boolean | Date | ObjectId | null | undefined

type MongoComparisonOperators<T> = {
    $eq?: T
    $ne?: T
    $gt?: T
    $gte?: T
    $lt?: T
    $lte?: T
    $in?: T[]
    $nin?: T[]
}

type MongoElementOperators = {
    $exists?: boolean
    $type?: string | number
}

type MongoStringOperators = {
    $regex?: string | RegExp
    $options?: string
}

type MongoOperators<T> = MongoComparisonOperators<T> & MongoElementOperators & MongoStringOperators

type DepthCounter = [never, 0, 1, 2, 3]

type MongoFilterValue<T, D extends number = 2> =
    [D] extends [never]
        ? unknown
        : T extends Primitive
            ? T | MongoOperators<T>
            : T extends Array<infer U>
                ? T | MongoOperators<T> | { $elemMatch?: MongoFilter<U, DepthCounter[D]>; $size?: number }
                : T | MongoOperators<T> | MongoFilter<T, DepthCounter[D]>

export type MongoFilter<T, D extends number = 2> = {
    [K in keyof T]?: MongoFilterValue<T[K], D>
} & {
    $or?: MongoFilter<T, D>[]
    $and?: MongoFilter<T, D>[]
    $nor?: MongoFilter<T, D>[]
    [key: \`\${string}.\${string}\`]: unknown
}

export interface BaseModel {
    _id: ObjectId
    createdAt: Date
    updatedAt: Date
    deletedAt?: Date | null
    createdBy?: ObjectId
    updatedBy?: ObjectId
    deletedBy?: ObjectId
}

export type BaseInput<T extends BaseModel | Partial<BaseModel>> = Omit<
    T,
    '_id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'deletedBy'
>

export type BaseCreateInput<T extends BaseModel | Partial<BaseModel>> = Partial<BaseInput<T>>

export interface ServiceContext {
    userId?: string
    user?: any
    metadata?: Record<string, any>
    transaction?: ClientSession
    // Multi-tenant / app-level filtering
    appId?: string
    appFilter?: Record<string, any>
    userFilter?: Record<string, any>
    // Academic year filtering
    tahunAjaranId?: ObjectId
}

type SkipQueryParser = Record<keyof Partial<QueryParams>, boolean> & {
    query?: boolean
}

export interface ServiceOptions<T extends BaseModel, U extends BaseInput<T>> {
    collectionName: string

    // Query capabilities
    searchFields?: string[]
    postLookupSearchFields?: string[]
    filterFields?: string[]
    postLookupFilterFields?: string[]
    filterPrefix?: string
    transformQuery?: (query: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Record<string, any>
    defaultQuery?: (query: Record<string, any>, context?: ServiceContext) => Record<string, any>
    sortFields?: string[]
    includeFields?: string[]
    defaultSort?: Record<string, 1 | -1>

    // Features
    softDelete?: boolean
    maxLimit?: number
    skipQueryParser?: Partial<SkipQueryParser>
    tahunAjaran?: boolean

    // Context-based filtering
    appFilterFields?: string[]
    userFilterFields?: string[]

    // Lookups configuration
    lookups?: Record<string, LookupOptions>
    optionalLookups?: Record<string, LookupOptions>
    findByIdLookups?: Record<string, LookupOptions> | string[]

    // Lifecycle hooks
    beforeCreate?: (data: U, context?: ServiceContext) => Promise<U> | U
    afterCreate?: (item: T, context?: ServiceContext) => Promise<T> | T
    beforeUpdate?: (id: string, data: Partial<T>, context?: ServiceContext) => Promise<Partial<T>> | Partial<T>
    afterUpdate?: (id: string, item: T, context?: ServiceContext) => Promise<T> | T
    beforeDelete?: (id: string, context?: ServiceContext) => Promise<void> | void
    afterDelete?: (id: string, context?: ServiceContext) => Promise<void> | void

    // Aggregation pipelines (legacy support)
    aggregatePipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
    findAllPipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
    findByIdPipeline?: (query?: Record<string, any>, context?: ServiceContext, params?: QueryParams) => Promise<PipelineStage[]> | PipelineStage[]
}
`
