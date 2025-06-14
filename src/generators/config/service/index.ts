export const serviceIndexTemplate = `
import { buildMongoQuery, QueryParams } from '@/shared/pagination'
import { db } from '@/shared/utils/db.util'
import { ObjectId } from 'mongodb'
import { BaseInput, BaseModel, ServiceOptions } from './types'

export class BaseService<T extends BaseModel, U extends BaseInput> {
    protected collectionName: string
    protected options: ServiceOptions<T, U>

    constructor(options: ServiceOptions<T, U>) {
        this.collectionName = options.collectionName
        this.options = options
    }

    protected async collection() {
        return db.getDb().collection(this.collectionName)
    }

    protected async aggregatePipeline(options?: Record<string, any>): Promise<any[]> {
        if (!this.options.aggregatePipeline) return [];
        return await Promise.resolve(this.options.aggregatePipeline(options));
    }
    
    protected async getFindAllPipeline(options?: Record<string, any>): Promise<any[]> {
        if (this.options.findAllPipeline) {
            return await Promise.resolve(this.options.findAllPipeline(options));
        }
        return this.aggregatePipeline(options);
    }
    
    protected async getFindByIdPipeline(options?: Record<string, any>): Promise<any[]> {
        if (this.options.findByIdPipeline) {
            return await Promise.resolve(this.options.findByIdPipeline(options));
        }
        return this.aggregatePipeline(options);
    }

    async findAll(params: QueryParams, options?: Record<string, any>) {
        const collection = await this.collection()
        let query
        
        if (this.options.generateQuery) {
            query = await this.options.generateQuery(await buildMongoQuery(params, options), options)
        } else {
            query = await buildMongoQuery(params, options)
        }

        const skip = (params.page - 1) * params.limit
        const customPipeline = await this.getFindAllPipeline(options);
        
        const pipeline = [
            { $match: query },
            ...customPipeline,
            {
                $sort: buildMongoSort(params)
            },
            { $skip: skip },
            { $limit: params.limit }
        ]

        const [data, total] = await Promise.all([
            collection.aggregate(pipeline).toArray(),
            collection.countDocuments(query)
        ])

        return {
            data,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit)
        }
    }

    async findById(id: string) {
        const collection = await this.collection()
        const pipeline = await this.getFindByIdPipeline()
        const items = await collection.aggregate([
            { $match: { _id: new ObjectId(id) } },
            ...pipeline
        ]).toArray()

        if (!items.length) throw new Error(\`Item not found in \${this.collectionName}\`)
        return items[0] as T
    }

    async find(options: Record<string, any>) {
        const collection = await this.collection()
        const items = await collection.find(options).toArray()
        return items
    }

    async findOne(options: Record<string, any>) {
        const collection = await this.collection()
        const item = await collection.findOne(options)
        return item
    }

    async findWithPipeline(pipeline: any[]) {
        const collection = await this.collection()
        const items = await collection.aggregate(pipeline).toArray()
        return items
    }

    async create(data: U): Promise<T> {
        const collection = await this.collection()
        const date = new Date()

        let processedData = { ...data }
        if (this.options.beforeCreate) {
            processedData = await this.options.beforeCreate(processedData)
        }

        const newItem = {
            ...processedData,
            _id: new ObjectId(),
            createdAt: date,
            updatedAt: date
        } as unknown as T

        await collection.insertOne(newItem)
        const createdItem = await this.findById(newItem._id.toString())

        if (this.options.afterCreate) {
            return await this.options.afterCreate(createdItem)
        }

        return createdItem
    }

    async createMany(dataArray: U[]) {
        const collection = await this.collection()
        const date = new Date()

        const items = await Promise.all(
            dataArray.map(async (data) => {
                let processedData = { ...data }
                if (this.options.beforeCreate) {
                    processedData = await this.options.beforeCreate(processedData)
                }

                return {
                    ...processedData,
                    _id: new ObjectId(),
                    createdAt: date,
                    updatedAt: date
                }
            })
        )

        if (items.length === 0) return 0

        const result = await collection.insertMany(items)
        return result.insertedIds
    }

    async update(id: string, data: Partial<T>): Promise<T> {
        const collection = await this.collection()

        let updateData = { ...data, updatedAt: new Date() } as Partial<T>
        if (this.options.beforeUpdate) {
            updateData = await this.options.beforeUpdate(id, updateData)
        }

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        )

        if (!result) throw new Error(\`Item not found in \${this.collectionName}\`)

        if (this.options.afterUpdate) {
            return await this.options.afterUpdate(result as T)
        }

        return result as T
    }

    async updateMany(filter: object, data: Partial<T>) {
        const collection = await this.collection()
        const updateData = {
            ...data,
            updatedAt: new Date()
        }

        const result = await collection.updateMany(filter, { $set: updateData })
        return result.modifiedCount
    }

    async delete(id: string) {
        const collection = await this.collection()
        const result = await collection.deleteOne({ _id: new ObjectId(id) })

        if (!result.deletedCount) throw new Error(\`Item not found in \${this.collectionName}\`)
        return { id }
    }

    async deleteMany(filter: object) {
        const collection = await this.collection()
        const result = await collection.deleteMany(filter)
        return result.deletedCount
    }
}

export function createService<T extends BaseModel, U extends BaseInput>(
    options: ServiceOptions<T, U>
): BaseService<T, U> {
    return new BaseService<T, U>(options)
}`