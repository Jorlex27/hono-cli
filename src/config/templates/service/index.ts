export const serviceIndexTemplate = `
import { Context } from 'hono'
import { ObjectId } from 'mongodb'
import { db } from '../utils/db.util'
import { BaseInput, BaseModel, MongoFilter, ServiceContext, ServiceOptions } from './types'
import { LookupOptions, PipelineStage } from '../aggregate/types'
import { QueryParams } from '../query/types'
import { QueryParser } from '../query'
import { AggregateBuilder } from '../aggregate'
import { ApiError } from '../errors'

export class BaseService<T extends BaseModel, U extends BaseInput<T>> {
    protected collectionName: string
    options: ServiceOptions<T, U>
    private queryParser: QueryParser

    constructor(options: ServiceOptions<T, U>) {
        this.collectionName = options.collectionName
        this.options = {
            softDelete: false,
            filterFields: ['*'],
            tahunAjaran: false,
            ...options
        }
        const allSearchFields = [
            ...(this.options.searchFields || []),
            ...(this.options.postLookupSearchFields || [])
        ]

        this.queryParser = new QueryParser({
            searchFields: allSearchFields,
            sortFields: this.options.sortFields,
            filterFields: this.options.filterFields,
            filterPrefix: this.options.filterPrefix,
            includeFields: this.options.includeFields,
            maxLimit: this.options.maxLimit,
            defaultSort: this.options.defaultSort,
        })
    }

    protected async collection() {
        return db.getDb().collection(this.collectionName)
    }

    protected applyContextFilters(
        query: Record<string, any>,
        context?: ServiceContext
    ): Record<string, any> {
        if (!context) return query

        const result = { ...query }

        // Apply app-level filters
        if (context.appFilter && this.options.appFilterFields?.length) {
            for (const field of this.options.appFilterFields) {
                if (context.appFilter[field] !== undefined) {
                    result[field] = context.appFilter[field]
                }
            }
        }

        // Apply user-level filters
        if (context.userFilter && this.options.userFilterFields?.length) {
            for (const field of this.options.userFilterFields) {
                if (context.userFilter[field] !== undefined) {
                    result[field] = context.userFilter[field]
                }
            }
        }

        return result
    }

    protected applyTahunAjaranFilter(
        query: Record<string, any>,
        context?: ServiceContext
    ): Record<string, any> {
        if (this.options.tahunAjaran && context?.tahunAjaranId) {
            query.tahunAjaranId = context.tahunAjaranId
        }
        return query
    }

    async findAll(c: Context, context?: ServiceContext): Promise<any> {
        const queryParams = c.req.query()
        const params = this.queryParser.parse(queryParams)

        const collection = await this.collection()
        let query = this.queryParser.buildMongoQuery(params)

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        if (this.options.defaultQuery) {
            query = this.options.defaultQuery(query, context)
        }

        const skip = (params.page - 1) * params.limit
        const pipeline = this.getFindAllPipeline(query, params.lookup)
        const projection = this.queryParser.buildProjection(params)

        const arraySize = params.arraySize || { needsPipeline: false }

        const basePipeline: PipelineStage[] = [
            ...pipeline,
            ...(projection ? [{ $project: projection }] : []),
            ...(arraySize.needsPipeline && arraySize.pipeline ? arraySize.pipeline : []),
        ]

        const facetPipeline = [
            ...basePipeline,
            {
                $facet: {
                    data: [{ $sort: params.sort }, { $skip: skip }, { $limit: params.limit }],
                    totalCount: [{ $count: 'total' }],
                },
            },
        ]

        const aggregateOptions: Record<string, unknown> = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        const [dataResult] = await collection.aggregate(facetPipeline, aggregateOptions).toArray()
        const total = dataResult?.totalCount[0]?.total || 0

        return {
            data: dataResult?.data,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
            hasNext: params.page < Math.ceil(total / params.limit),
            hasPrev: params.page > 1,
        }
    }

    async findAllWithPipeline(
        c: Context,
        customPipeline?: PipelineStage[],
        options?: {
            skipQueryParser?: boolean
            skipPagination?: boolean
            skipSort?: boolean
            defaultSort?: Record<string, 1 | -1>
            defaultQuery?: Record<string, any>
        },
        context?: ServiceContext
    ): Promise<{
        data: T[]
        total?: number
        page?: number
        limit?: number
        totalPages?: number
        hasNext?: boolean
        hasPrev?: boolean
    }> {
        const queryParams = c.req.query()
        const params = this.queryParser.parse(queryParams)

        const collection = await this.collection()
        let query = this.queryParser.buildMongoQuery(params)

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        if (this.options.defaultQuery) {
            query = this.options.defaultQuery(query, context)
        }

        if (options?.defaultQuery) {
            query = { ...query, ...options.defaultQuery }
        }

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        let matchQuery: PipelineStage | undefined = { $match: query }
        if (options?.skipQueryParser === true) {
            matchQuery = undefined
        }

        if (options?.skipPagination === true) {
            const defaultPipeline = customPipeline || this.getFindAllPipeline(query)

            let sort: PipelineStage | undefined = { $sort: options?.defaultSort || params.sort }
            if (options?.skipSort === true) {
                sort = undefined
            }

            const pipeline = [
                ...(matchQuery ? [matchQuery] : []),
                ...defaultPipeline,
                ...(sort ? [sort] : []),
            ]

            const aggregateOptions: Record<string, unknown> = {}
            if (context?.transaction) {
                aggregateOptions.session = context.transaction
            }

            const data = await collection.aggregate(pipeline, aggregateOptions).toArray()
            return { data: data as T[] }
        }

        const additionalPipeline = customPipeline || []
        const skip = (params.page - 1) * params.limit

        const pipeline = [
            ...(matchQuery ? [matchQuery] : []),
            ...additionalPipeline,
            {
                $facet: {
                    data: [
                        { $sort: options?.defaultSort || params.sort },
                        { $skip: skip },
                        { $limit: params.limit },
                    ],
                    totalCount: [{ $count: 'total' }],
                },
            },
        ]

        const aggregateOptions: Record<string, unknown> = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        const [dataResult] = await collection.aggregate(pipeline, aggregateOptions).toArray()
        const total = dataResult?.totalCount[0]?.total || 0

        return {
            data: dataResult?.data || [],
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
            hasNext: params.page < Math.ceil(total / params.limit),
            hasPrev: params.page > 1,
        }
    }

    async findById(
        id: string,
        context?: ServiceContext,
        options?: { includeDeleted?: boolean }
    ): Promise<T> {
        const collection = await this.collection()
        const pipeline = this.getFindByIdPipeline()

        let filter: Record<string, unknown> = { _id: new ObjectId(id) }

        if (this.options.softDelete && !options?.includeDeleted) {
            filter.deletedAt = { $exists: false }
        }

        filter = this.applyContextFilters(filter, context)
        filter = this.applyTahunAjaranFilter(filter, context)

        const aggregateOptions: Record<string, unknown> = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        const items = await collection
            .aggregate([{ $match: filter }, ...pipeline], aggregateOptions)
            .toArray()

        if (!items.length) {
            throw ApiError.notFound(this.collectionName)
        }

        return items[0] as T
    }

    async find(filter: MongoFilter<T>, context?: ServiceContext): Promise<T[]> {
        const collection = await this.collection()

        let query: Record<string, unknown> = { ...filter }

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyContextFilters(query, context)

        const findOptions: any = { sort: { createdAt: -1 } }
        if (context?.transaction) {
            findOptions.session = context.transaction
        }

        const items = await collection.find(query, findOptions).toArray()
        return items as T[]
    }

    async findOne(filter: MongoFilter<T>, context?: ServiceContext): Promise<T | null> {
        const collection = await this.collection()

        let query: Record<string, unknown> = { ...filter }

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        const findOptions: any = {}
        if (context?.transaction) {
            findOptions.session = context.transaction
        }

        const item = await collection.findOne(query, findOptions)
        return item ? (item as T) : null
    }

    async findOneAndUpdate(
        filter: MongoFilter<T>,
        operation: Record<string, unknown>,
        options?: Record<string, unknown>,
        context?: ServiceContext
    ): Promise<T> {
        const collection = await this.collection()

        let query: Record<string, unknown> = { ...filter }
        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        const updateOptions: Record<string, unknown> = { returnDocument: 'after' }
        if (options) Object.assign(updateOptions, options)
        if (context?.transaction) updateOptions.session = context.transaction

        const item = await collection.findOneAndUpdate(query, operation, updateOptions)
        if (!item) {
            throw ApiError.notFound(this.collectionName)
        }

        return item as unknown as T
    }

    async pipeline<K = T>(pipeline: PipelineStage[], context?: ServiceContext): Promise<K[]> {
        const collection = await this.collection()

        const aggregateOptions: Record<string, unknown> = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        return collection.aggregate(pipeline, aggregateOptions).toArray() as Promise<K[]>
    }

    async create(
        data: U,
        context?: ServiceContext,
        options?: { skipFindById?: boolean }
    ): Promise<T> {
        const collection = await this.collection()
        const date = new Date()

        let processedData: U = { ...data }

        if (this.options.beforeCreate) {
            processedData = await this.options.beforeCreate(processedData, context)
        }

        const newItem: Record<string, any> = {
            ...processedData,
            _id: new ObjectId(),
            createdAt: date,
            updatedAt: date,
            ...(context?.userId && { createdBy: new ObjectId(context.userId) }),
        }

        if (this.options.tahunAjaran && context?.tahunAjaranId) {
            newItem.tahunAjaranId = context.tahunAjaranId
        }

        const insertOptions: any = {}
        if (context?.transaction) {
            insertOptions.session = context.transaction
        }

        const result = await collection.insertOne(newItem, insertOptions)

        if (options?.skipFindById) {
            return newItem as T
        }

        const createdItem = await this.findById(result.insertedId.toString(), context)

        if (this.options.afterCreate) {
            return await this.options.afterCreate(createdItem, context)
        }

        return createdItem
    }

    async createMany(
        dataArray: U[],
        context?: ServiceContext,
        options?: { skipFindById?: boolean }
    ): Promise<T[]> {
        const collection = await this.collection()
        const date = new Date()

        const items = dataArray.map(data => {
            const item: any = {
                ...data,
                _id: new ObjectId(),
                createdAt: date,
                updatedAt: date,
                ...(context?.userId && { createdBy: new ObjectId(context.userId) }),
            }
            if (this.options.tahunAjaran && context?.tahunAjaranId) {
                item.tahunAjaranId = context.tahunAjaranId
            }
            return item
        })

        const insertOptions: any = {}
        if (context?.transaction) {
            insertOptions.session = context.transaction
        }

        await collection.insertMany(items, insertOptions)

        if (options?.skipFindById) {
            return items as T[]
        }

        return this.find({ _id: { $in: items.map(item => item._id) } } as MongoFilter<T>, context)
    }

    async update(
        id: string,
        data: Partial<T>,
        context?: ServiceContext,
        options?: { skipBeforeUpdate?: boolean }
    ): Promise<T> {
        const collection = await this.collection()

        let updateData: Partial<T> = {
            ...data,
            updatedAt: new Date(),
            ...(context?.userId && { updatedBy: new ObjectId(context.userId) }),
        } as Partial<T>

        if (!options?.skipBeforeUpdate && this.options.beforeUpdate) {
            updateData = await this.options.beforeUpdate(id, updateData, context)
        }

        let filter: Record<string, unknown> = { _id: new ObjectId(id) }
        if (this.options.softDelete) {
            filter.deletedAt = { $exists: false }
        }
        filter = this.applyTahunAjaranFilter(filter, context)

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.findOneAndUpdate(
            filter,
            { $set: updateData },
            updateOptions
        )

        if (!result) {
            throw ApiError.notFound(this.collectionName)
        }

        let finalResult = result as unknown as T

        if (this.options.afterUpdate) {
            finalResult = await this.options.afterUpdate(id, finalResult, context)
        }

        return finalResult
    }

    async updateMany(
        filter: MongoFilter<T>,
        data: Partial<T>,
        context?: ServiceContext
    ): Promise<number> {
        const collection = await this.collection()

        let query: Record<string, unknown> = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        const updateData = {
            ...data,
            updatedAt: new Date(),
            ...(context?.userId && { updatedBy: new ObjectId(context.userId) }),
        }

        const updateOptions: any = {}
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.updateMany(query, { $set: updateData }, updateOptions)
        return result.modifiedCount
    }

    async advanceUpdate(
        filter: MongoFilter<T>,
        operation: Record<string, unknown>,
        context?: ServiceContext,
        options?: { arrayFilters?: Record<string, unknown>[] }
    ): Promise<T> {
        const collection = await this.collection()

        const query: Record<string, unknown> = { ...filter }

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }
        if (options?.arrayFilters) {
            updateOptions.arrayFilters = options.arrayFilters
        }

        const result = await collection.findOneAndUpdate(query, operation, updateOptions)
        if (!result) {
            throw ApiError.notFound(this.collectionName)
        }
        return result as unknown as T
    }

    async delete(id: string, context?: ServiceContext): Promise<{ id: string }> {
        if (this.options.beforeDelete) {
            await this.options.beforeDelete(id, context)
        }

        if (this.options.softDelete) {
            await this.update(
                id,
                {
                    deletedAt: new Date(),
                    ...(context?.userId && { deletedBy: new ObjectId(context.userId) }),
                } as unknown as Partial<T>,
                context,
                { skipBeforeUpdate: true }
            )
        } else {
            const collection = await this.collection()

            let filter: Record<string, unknown> = { _id: new ObjectId(id) }
            filter = this.applyTahunAjaranFilter(filter, context)

            const deleteOptions: any = {}
            if (context?.transaction) {
                deleteOptions.session = context.transaction
            }

            const result = await collection.deleteOne(filter, deleteOptions)

            if (!result.deletedCount) {
                throw ApiError.notFound(this.collectionName)
            }
        }

        if (this.options.afterDelete) {
            await this.options.afterDelete(id, context)
        }

        return { id }
    }

    async deleteMany(filter: MongoFilter<T>, context?: ServiceContext): Promise<number> {
        const collection = await this.collection()

        let query: Record<string, unknown> = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        const deleteOptions: any = {}
        if (context?.transaction) {
            deleteOptions.session = context.transaction
        }

        if (this.options.softDelete) {
            const result = await collection.updateMany(
                query,
                {
                    $set: {
                        deletedAt: new Date(),
                        ...(context?.userId && { deletedBy: new ObjectId(context.userId) }),
                    },
                },
                deleteOptions
            )
            return result.modifiedCount
        } else {
            const result = await collection.deleteMany(query, deleteOptions)
            return result.deletedCount
        }
    }

    async restore(id: string, context?: ServiceContext): Promise<T> {
        if (!this.options.softDelete) {
            throw ApiError.badRequest('Soft delete is not enabled')
        }

        const collection = await this.collection()

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), deletedAt: { $exists: true } },
            {
                $unset: { deletedAt: '', deletedBy: '' },
                $set: {
                    updatedAt: new Date(),
                    ...(context?.userId && { restoredBy: new ObjectId(context.userId) }),
                },
            },
            updateOptions
        )

        if (!result) {
            throw ApiError.notFound(\`Deleted item in \${this.collectionName}\`)
        }

        return result as unknown as T
    }

    async hardDelete(id: string, context?: ServiceContext): Promise<{ id: string }> {
        if (!this.options.softDelete) {
            throw ApiError.badRequest('Hard delete only available when soft delete is enabled')
        }

        const collection = await this.collection()

        const item = await collection.findOne(
            { _id: new ObjectId(id) },
            { projection: { deletedAt: 1 } }
        )

        if (!item) {
            throw ApiError.notFound(this.collectionName)
        }

        if (!item.deletedAt) {
            throw ApiError.badRequest('Item must be soft deleted before hard delete')
        }

        if (this.options.beforeDelete) {
            await this.options.beforeDelete(id, context)
        }

        const deleteOptions: any = {}
        if (context?.transaction) {
            deleteOptions.session = context.transaction
        }

        const result = await collection.deleteOne(
            { _id: new ObjectId(id), deletedAt: { $exists: true } },
            deleteOptions
        )

        if (!result.deletedCount) {
            throw ApiError.notFound(\`Soft deleted item in \${this.collectionName}\`)
        }

        if (this.options.afterDelete) {
            await this.options.afterDelete(id, context)
        }

        return { id }
    }

    async advanceDelete(
        filter: MongoFilter<T>,
        context?: ServiceContext,
        options?: { operation?: 'one' | 'all' }
    ) {
        const collection = await this.collection()

        const query: Record<string, unknown> = { ...filter }

        const deleteOptions: any = {}
        if (context?.transaction) {
            deleteOptions.session = context.transaction
        }

        if (options?.operation === 'one') {
            return await collection.deleteOne(query, deleteOptions)
        } else {
            return await collection.deleteMany(query, deleteOptions)
        }
    }

    async getStats(context?: ServiceContext): Promise<any> {
        const collection = await this.collection()
        const baseMatch = this.options.softDelete ? { deletedAt: { $exists: false } } : {}

        const aggregateOptions: Record<string, unknown> = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        const stats = await collection
            .aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        oldest: { $min: '$createdAt' },
                        newest: { $max: '$createdAt' },
                    },
                },
            ], aggregateOptions)
            .toArray()

        return stats[0] || { total: 0 }
    }

    async countDocuments(
        filter?: Record<string, any> | Context,
        context?: ServiceContext
    ): Promise<number> {
        const collection = await this.collection()
        let query: Record<string, any> = {}

        if (filter && typeof filter === 'object' && 'req' in filter) {
            const c = filter as Context
            const queryParams = c.req.query()
            const params = this.queryParser.parse(queryParams)
            query = this.queryParser.buildMongoQuery(params)
        } else if (filter) {
            query = { ...(filter as Record<string, any>) }
        }

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyContextFilters(query, context)
        query = this.applyTahunAjaranFilter(query, context)

        const countOptions: any = {}
        if (context?.transaction) {
            countOptions.session = context.transaction
        }

        return collection.countDocuments(query, countOptions)
    }

    async distinct(
        field: string,
        filter?: Record<string, any>,
        context?: ServiceContext
    ): Promise<any[]> {
        const collection = await this.collection()
        let query: Record<string, any> = filter || {}

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        query = this.applyTahunAjaranFilter(query, context)

        const distinctOptions: any = {}
        if (context?.transaction) {
            distinctOptions.session = context.transaction
        }

        return collection.distinct(field, query, distinctOptions)
    }

    // Lookup pipeline generation
    private generateLookupPipeline(
        lookupsConfig?: Record<string, LookupOptions>,
        requestedLookups?: string[]
    ): PipelineStage[] {
        const defaultLookups = lookupsConfig || this.options.lookups || {}
        const optionalLookups = this.options.optionalLookups || {}

        const lookupsToApply: Record<string, LookupOptions> = { ...defaultLookups }

        if (requestedLookups && requestedLookups.length > 0) {
            for (const key of requestedLookups) {
                const optionalLookup = optionalLookups[key]
                if (optionalLookup && !lookupsToApply[key]) {
                    lookupsToApply[key] = optionalLookup
                }
            }
        }

        if (Object.keys(lookupsToApply).length === 0) {
            return []
        }

        const builder = new AggregateBuilder(this.options.softDelete)

        for (const [alias, config] of Object.entries(lookupsToApply)) {
            builder.lookup({
                from: config.from,
                localField: config.localField,
                foreignField: config.foreignField || '_id',
                as: config.as || alias,
                project: config.project || { _id: 1, name: 1 },
                preserveNullAndEmptyArrays: config.preserveNullAndEmptyArrays ?? true,
                pipeline: config.pipeline,
                let: config.let,
                isUnwind: config.isUnwind,
                softDelete: config.softDelete,
            })
        }

        return builder.build()
    }

    private generateFindByIdLookupPipeline(): PipelineStage[] {
        if (this.options.findByIdLookups) {
            if (Array.isArray(this.options.findByIdLookups)) {
                const filteredLookups: Record<string, LookupOptions> = {}
                const includeAliases = this.options.findByIdLookups
                const allLookups = {
                    ...this.options.lookups,
                    ...this.options.optionalLookups,
                }

                for (const alias of includeAliases) {
                    const lookupConfig = allLookups[alias]
                    if (lookupConfig) {
                        filteredLookups[alias] = lookupConfig
                    }
                }

                return this.generateLookupPipeline(filteredLookups)
            } else {
                return this.generateLookupPipeline(this.options.findByIdLookups)
            }
        }

        return this.generateLookupPipeline()
    }

    private separatePrePostLookupFilters(
        query: Record<string, any>
    ): {
        preLookupFilters: Record<string, any>
        postLookupFilters: Record<string, any>
    } {
        const preLookupFilters: Record<string, any> = {}
        const postLookupFilters: Record<string, any> = {}
        const postLookupPrefixes = this.options.postLookupFilterFields || []

        for (const [key, value] of Object.entries(query)) {
            if (key === '$or' || key === 'deletedAt') continue

            const hasPostLookupPrefix = postLookupPrefixes.some(prefix => key.startsWith(\`\${prefix}.\`))

            if (hasPostLookupPrefix) {
                postLookupFilters[key] = value
            } else {
                preLookupFilters[key] = value
            }
        }

        return { preLookupFilters, postLookupFilters }
    }

    private separatePrePostLookupSearch(
        query: Record<string, any>
    ): {
        preLookupSearch: any[]
        postLookupSearch: any[]
    } {
        const preLookupSearch: any[] = []
        const postLookupSearch: any[] = []
        const postLookupPrefixes = this.options.postLookupSearchFields || []

        if (!query.$or || !Array.isArray(query.$or)) {
            return { preLookupSearch, postLookupSearch }
        }

        for (const orItem of query.$or) {
            if (typeof orItem !== 'object' || Array.isArray(orItem)) continue

            const fieldName = Object.keys(orItem)[0]
            if (!fieldName) continue

            const hasPostLookupPrefix = postLookupPrefixes.some(prefix => fieldName.startsWith(\`\${prefix}.\`))

            if (hasPostLookupPrefix) {
                postLookupSearch.push(orItem)
            } else {
                preLookupSearch.push(orItem)
            }
        }

        return { preLookupSearch, postLookupSearch }
    }

    private getFindAllPipeline(
        query?: Record<string, any>,
        requestedLookups?: string[]
    ): PipelineStage[] {
        // Use legacy pipeline if defined
        if (this.options.findAllPipeline || this.options.aggregatePipeline) {
            return []
        }

        const lookupPipeline = this.generateLookupPipeline(undefined, requestedLookups)

        if (!query || Object.keys(query).length === 0) {
            const pipeline: PipelineStage[] = []
            if (this.options.softDelete) {
                pipeline.push({ $match: { deletedAt: { $exists: false } } })
            }
            pipeline.push(...lookupPipeline)
            return pipeline
        }

        const { preLookupFilters, postLookupFilters } = this.separatePrePostLookupFilters(query)
        const { preLookupSearch, postLookupSearch } = this.separatePrePostLookupSearch(query)

        const pipeline: PipelineStage[] = []

        const preLookupMatch: Record<string, any> = { ...preLookupFilters }
        if (preLookupSearch.length > 0) {
            preLookupMatch.$or = preLookupSearch
        }
        if (this.options.softDelete && !preLookupMatch.deletedAt) {
            preLookupMatch.deletedAt = { $exists: false }
        }
        if (Object.keys(preLookupMatch).length > 0) {
            pipeline.push({ $match: preLookupMatch })
        }

        pipeline.push(...lookupPipeline)

        const postLookupMatch: Record<string, any> = { ...postLookupFilters }
        if (postLookupSearch.length > 0) {
            postLookupMatch.$or = postLookupSearch
        }
        if (Object.keys(postLookupMatch).length > 0) {
            pipeline.push({ $match: postLookupMatch })
        }

        return pipeline
    }

    private getFindByIdPipeline(): PipelineStage[] {
        // Use legacy pipeline if defined
        if (this.options.findByIdPipeline || this.options.aggregatePipeline) {
            return []
        }
        return this.generateFindByIdLookupPipeline()
    }

    get _collectionName() {
        return this.collectionName
    }

    get searchFields() {
        return this.options.searchFields || []
    }

    get filterFields() {
        return this.options.filterFields || []
    }

    get sortFields() {
        return this.options.sortFields || []
    }
}

export type { MongoFilter, BaseModel, BaseInput, BaseCreateInput, ServiceContext, ServiceOptions } from './types'
`
