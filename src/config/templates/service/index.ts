export const serviceIndexTemplate = `
import { Context } from "hono"
import { ObjectId } from "mongodb"
import { db } from "../utils/db.util"
import { BaseInput, BaseModel, ServiceContext, ServiceOptions } from "./types"
import { PipelineStage } from "../aggregate/types"
import { QueryParams } from "../query/types"
import { QueryParser } from "../query"

export class BaseService<T extends BaseModel, U extends BaseInput<T>> {
    protected collectionName: string
    options: ServiceOptions<T, U>
    private queryParser: QueryParser

    constructor(options: ServiceOptions<T, U>) {
        this.collectionName = options.collectionName
        this.options = {
            softDelete: false,
            filterFields: ['*'],
            ...options
        }
        this.queryParser = new QueryParser({
            searchFields: this.options.searchFields,
            sortFields: this.options.sortFields,
            filterFields: this.options.filterFields,
            filterPrefix: this.options.filterPrefix,
            includeFields: this.options.includeFields,
            maxLimit: this.options.maxLimit,
            defaultSort: this.options.defaultSort,
            skipQueryParser: this.options.skipQueryParser
        })
    }

    protected async collection() {
        return db.getDb().collection(this.collectionName)
    }

    async findAll(c: Context, context?: ServiceContext): Promise<any> {
        const queryParams = c.req.query()
        const params = this.queryParser.parse(queryParams)

        const collection = await this.collection()
        let query = this.queryParser.buildMongoQuery(params)

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        if (this.options.accessControl?.canRead && context) {
            query = await this.applyAccessControl(query, context)
        }

        if (this.options.transformQuery) {
            query = this.options.transformQuery(query, context, params)
        }

        const skip = (params.page - 1) * params.limit
        const pipeline = await this.getFindAllPipeline(query, context, params)
        const projection = this.queryParser.buildProjection(params)

        const arraySize = params.arraySize || { needsPipeline: false }

        let matchQuery: PipelineStage | undefined = { $match: query }
        if (this.options.skipQueryParser?.query === true) {
            matchQuery = undefined
        }

        const basePipeline: PipelineStage[] = [
            ...(matchQuery ? [matchQuery] : []),
            ...pipeline,
            ...(projection ? [{ $project: projection }] : []),
            ...(arraySize.needsPipeline && arraySize.pipeline ? arraySize.pipeline : []),
        ]

        const facetPipeline = [
            ...basePipeline,
            {
                $facet: {
                    data: [
                        { $sort: params.sort },
                        { $skip: skip },
                        { $limit: params.limit }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ]

        const [dataResult] = await collection.aggregate(facetPipeline).toArray()
        const total = dataResult?.totalCount[0]?.total || 0

        const result = {
            data: dataResult?.data,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
            hasNext: params.page < Math.ceil(total / params.limit),
            hasPrev: params.page > 1
        }

        return result
    }

    async findAllWithPipeline(c: Context, customPipeline?: PipelineStage[], options?: { skipQueryParser?: boolean, defaultSort?: Record<string, 1 | -1>, defaultQuery?: Record<string, any> }): Promise<{
        data: T[]
        total: number
        page: number
        limit: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }> {
        const queryParams = c.req.query()
        const params = this.queryParser.parse(queryParams)

        const collection = await this.collection()
        let query = this.queryParser.buildMongoQuery(params)

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        if (options?.defaultQuery) {
            query = { ...query, ...options.defaultQuery }
        }

        const skip = (params.page - 1) * params.limit

        const additionalPipeline = customPipeline || []

        let matchQuery: PipelineStage | undefined = { $match: query }
        if (options?.skipQueryParser === true) {
            matchQuery = undefined
        }

        const pipeline = [
            ...(matchQuery ? [matchQuery] : []),
            ...additionalPipeline,
            {
                $facet: {
                    data: [
                        { $sort: options?.defaultSort || params.sort },
                        { $skip: skip },
                        { $limit: params.limit }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ]

        const [dataResult] = await collection.aggregate(pipeline).toArray()
        const total = dataResult?.totalCount[0]?.total || 0

        return {
            data: dataResult?.data || [],
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
            hasNext: params.page < Math.ceil(total / params.limit),
            hasPrev: params.page > 1
        }
    }

    async findAllWithPipelineData(c: Context, customPipeline?: PipelineStage[], options?: { skipQueryParser?: boolean, skipSort?: boolean, defaultSort?: Record<string, 1 | -1> }, context?: ServiceContext): Promise<T[]> {
        const queryParams = c.req.query()
        const params = this.queryParser.parse(queryParams)

        const collection = await this.collection()
        let query = this.queryParser.buildMongoQuery(params)

        if (this.options.softDelete && !query.deletedAt) {
            query.deletedAt = { $exists: false }
        }

        const defaultPipeline = customPipeline || await this.getFindAllPipeline(query, context, params)

        let matchQuery: PipelineStage | undefined = { $match: query }
        if (options?.skipQueryParser === true) {
            matchQuery = undefined
        }

        let sort: PipelineStage | undefined = { $sort: options?.defaultSort || params.sort }
        if (options?.skipSort === true) {
            sort = undefined
        }

        const pipeline = [
            ...(matchQuery ? [matchQuery] : []),
            ...defaultPipeline,
            ...(sort ? [sort] : []),
        ]

        const data = await collection.aggregate(pipeline).toArray()

        return data as T[]
    }

    async findById(id: string, context?: ServiceContext, params?: QueryParams, options?: { includeDeleted?: boolean }): Promise<T> {
        const collection = await this.collection()
        const pipeline = await this.getFindByIdPipeline(params, context)

        const filter: any = { _id: new ObjectId(id) }
        if (this.options.softDelete && !options?.includeDeleted) {
            filter.deletedAt = { $exists: false }
        }

        const aggregateOptions: any = {}
        if (context?.transaction) {
            aggregateOptions.session = context.transaction
        }

        const items = await collection.aggregate([
            { $match: filter },
            ...pipeline
        ], aggregateOptions).toArray()

        if (!items.length) {
            throw new Error(\`Item not found in \${this.collectionName}\`)
        }

        const item = items[0] as T

        if (this.options.accessControl?.canRead && context) {
            if (!this.options.accessControl.canRead(item, context)) {
                throw new Error('Access denied')
            }
        }

        return item
    }

    async find(filter: Record<string, any>, context?: ServiceContext): Promise<T[]> {
        const collection = await this.collection()

        let query = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        if (this.options.accessControl?.canRead && context) {
            query = await this.applyAccessControl(query, context)
        }

        const findOptions: any = {
            sort: { createdAt: -1 }
        }

        if (context?.transaction) {
            findOptions.session = context.transaction
        }

        const items = await collection.find(query, findOptions).toArray()

        if (this.options.accessControl?.canRead && context) {
            const filteredItems = items.filter(item =>
                this.options.accessControl!.canRead!(item as T, context)
            )
            return filteredItems as T[]
        }

        return items as T[]
    }

    async findOne(filter: Record<string, any>, context?: ServiceContext): Promise<T | null> {
        const collection = await this.collection()

        let query = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        if (this.options.accessControl?.canRead && context) {
            query = await this.applyAccessControl(query, context)
        }

        const findOptions: any = {}

        if (context?.transaction) {
            findOptions.session = context.transaction
        }

        const item = await collection.findOne(query, findOptions)

        if (!item) {
            return null
        }

        if (this.options.accessControl?.canRead && context) {
            if (!this.options.accessControl.canRead(item as T, context)) {
                throw new Error('Access denied')
            }
        }

        return item as T
    }

    async findOneAndUpdate(filter: Record<string, any>, operation: Record<string, any>, options?: Record<string, any>, context?: ServiceContext): Promise<T> {
        const collection = await this.collection()

        const updateOptions: any = { returnDocument: 'after' }

        if (options) {
            Object.assign(updateOptions, options)
        }

        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const item = await collection.findOneAndUpdate(filter, operation, updateOptions)
        if (!item) {
            throw new Error(\`Item not found in \${this.collectionName}\`)
        }

        return item as unknown as T
    }

    async pipeline(pipeline: PipelineStage[]): Promise<T[]> {
        const collection = await this.collection()
        const result = collection.aggregate(pipeline).toArray() as Promise<T[]>

        return result
    }

    async create(data: U, context?: ServiceContext, options?: { skipFindById?: boolean }): Promise<T> {
        const collection = await this.collection()
        const date = new Date()

        let processedData = { ...data }

        if (this.options.beforeCreate) {
            processedData = await this.options.beforeCreate(processedData, context)
        }

        const newItem: Record<string, any> = {
            ...processedData,
            _id: new ObjectId(),
            createdAt: date,
            updatedAt: date,
            ...(context?.userId && { createdBy: new ObjectId(context.userId) })
        } as unknown as T

        if (this.options.accessControl?.canCreate && context) {
            if (!this.options.accessControl.canCreate(newItem, context)) {
                throw new Error('Access denied')
            }
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
            const result = await this.options.afterCreate(createdItem, context)
            return result
        }

        return createdItem
    }

    async update(id: string, data: Partial<T>, context?: ServiceContext, options?: { skipBeforeUpdate: boolean }): Promise<T> {
        const collection = await this.collection()
        const existingItem = await this.findById(id, context)

        if (this.options.accessControl?.canUpdate && context) {
            if (!this.options.accessControl.canUpdate(existingItem, data, context)) {
                throw new Error('Access denied')
            }
        }

        let updateData = {
            ...data,
            updatedAt: new Date(),
            ...(context?.userId && { updatedBy: new ObjectId(context.userId) })
        } as Partial<T>

        if (!options?.skipBeforeUpdate && this.options.beforeUpdate) {
            updateData = await this.options.beforeUpdate(id, updateData, context)
        }

        const filter: any = { _id: new ObjectId(id) }
        if (this.options.softDelete) {
            filter.deletedAt = { $exists: false }
        }

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
            throw new Error(\`Item not found in \${this.collectionName}\`)
        }

        let finalResult = result as unknown as T

        if (this.options.afterUpdate) {
            finalResult = await this.options.afterUpdate(finalResult, context)
        }

        return finalResult
    }

    async advanceUpdate(filter: Record<string, any>, operation: Record<string, any>, context?: ServiceContext): Promise<T> {
        const collection = await this.collection()

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.findOneAndUpdate(
            filter,
            operation,
            updateOptions
        )
        if (!result) {
            throw new Error(\`Item not found in \${this.collectionName}\`)
        }
        return result as unknown as T
    }

    async delete(id: string, context?: ServiceContext): Promise<{ id: string }> {
        const existingItem = await this.findById(id, context)

        if (this.options.accessControl?.canDelete && context) {
            if (!this.options.accessControl.canDelete(existingItem, context)) {
                throw new Error('Access denied')
            }
        }

        if (this.options.beforeDelete) {
            await this.options.beforeDelete(id, context)
        }

        if (this.options.softDelete) {
            await this.update(id, {
                deletedAt: new Date(),
                ...(context?.userId && { deletedBy: new ObjectId(context.userId) })
            } as unknown as Partial<T>, context, { skipBeforeUpdate: true })
        } else {
            const collection = await this.collection()

            const deleteOptions: any = {}
            if (context?.transaction) {
                deleteOptions.session = context.transaction
            }

            const result = await collection.deleteOne(
                { _id: new ObjectId(id) },
                deleteOptions
            )

            if (!result.deletedCount) {
                throw new Error(\`Item not found in \${this.collectionName}\`)
            }
        }

        if (this.options.afterDelete) {
            await this.options.afterDelete(id, context)
        }

        return { id }
    }

    async restore(id: string, context?: ServiceContext): Promise<T> {
        if (!this.options.softDelete) {
            throw new Error('Soft delete is not enabled')
        }

        const collection = await this.collection()

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id), deletedAt: { $exists: true } },
            {
                $unset: { deletedAt: "", deletedBy: "" },
                $set: {
                    updatedAt: new Date(),
                    ...(context?.userId && { restoredBy: new ObjectId(context.userId) })
                }
            },
            updateOptions
        )

        if (!result) {
            throw new Error(\`Deleted item not found in \${this.collectionName}\`)
        }

        return result as unknown as T
    }

    async createMany(dataArray: U[], context?: ServiceContext): Promise<T[]> {
        const collection = await this.collection()
        const date = new Date()

        const items = dataArray.map(data => ({
            ...data,
            _id: new ObjectId(),
            createdAt: date,
            updatedAt: date,
            ...(context?.userId && { createdBy: new ObjectId(context.userId) })
        }))

        const insertOptions: any = {}
        if (context?.transaction) {
            insertOptions.session = context.transaction
        }

        await collection.insertMany(items, insertOptions)

        const createdItems = this.find({ _id: { $in: items.map(item => item._id) } }, context)
        return createdItems
    }

    async updateMany(filter: Record<string, any>, data: Partial<T>, context?: ServiceContext): Promise<number> {
        const collection = await this.collection()

        let query = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        const updateData = {
            ...data,
            updatedAt: new Date(),
            ...(context?.userId && { updatedBy: context.userId })
        }

        const updateOptions: any = {}
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        const result = await collection.updateMany(
            query,
            { $set: updateData },
            updateOptions
        )

        return result.modifiedCount
    }

    async deleteMany(filter: Record<string, any>, context?: ServiceContext): Promise<number> {
        const collection = await this.collection()

        let query = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }

        const deleteOptions: any = {}
        if (context?.transaction) {
            deleteOptions.session = context.transaction
        }

        let result: any

        if (this.options.softDelete) {
            result = await collection.updateMany(
                query,
                {
                    $set: {
                        deletedAt: new Date(),
                        ...(context?.userId && { deletedBy: context.userId })
                    }
                },
                deleteOptions
            )
            return result.modifiedCount
        } else {
            result = await collection.deleteMany(query, deleteOptions)
            return result.deletedCount
        }
    }

    async advanceDelete(filter: Record<string, any>, context?: ServiceContext, options?: { operation?: 'one' | 'all' }): Promise<T | T[]> {
        const collection = await this.collection()

        const updateOptions: any = { returnDocument: 'after' }
        if (context?.transaction) {
            updateOptions.session = context.transaction
        }

        if (options?.operation === 'one') {
            const result = await collection.deleteOne(filter, updateOptions)
            return result as unknown as T
        } else {
            const result = await collection.deleteMany(filter, updateOptions)
            return result as unknown as T[]
        }
    }

    async getStats(): Promise<any> {
        const collection = await this.collection()
        const baseMatch = this.options.softDelete ? { deletedAt: { $exists: false } } : {}

        const stats = await collection.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    oldest: { $min: "$createdAt" },
                    newest: { $max: "$createdAt" }
                }
            }
        ]).toArray()

        const result = stats[0] || { total: 0 }
        return result
    }

    async countDocuments(filter: Record<string, any>): Promise<number> {
        const collection = await this.collection()
        let query = { ...filter }
        if (this.options.softDelete) {
            query.deletedAt = { $exists: false }
        }
        return collection.countDocuments(query)
    }

    private async getFindAllPipeline(query?: Record<string, any>, context?: ServiceContext, params?: QueryParams): Promise<any[]> {
        if (this.options.findAllPipeline) {
            return await Promise.resolve(this.options.findAllPipeline(query, context, params))
        }
        if (this.options.aggregatePipeline) {
            return await Promise.resolve(this.options.aggregatePipeline(query, context, params))
        }
        return []
    }

    private async getFindByIdPipeline(query?: Record<string, any>, context?: ServiceContext, params?: QueryParams): Promise<any[]> {
        if (this.options.findByIdPipeline) {
            return await Promise.resolve(this.options.findByIdPipeline(query, context, params))
        }
        if (this.options.aggregatePipeline) {
            return await Promise.resolve(this.options.aggregatePipeline(query, context, params))
        }
        return []
    }

    private async applyAccessControl(query: any, context: ServiceContext): Promise<any> {
        return query
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
`