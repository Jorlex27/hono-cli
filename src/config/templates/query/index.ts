export const queryIndexTemplate = `
import { ObjectId } from "mongodb"
import { ArraySizeFilter, ExportFormat, FilterOperator, FilterParseResult, QueryOptions, QueryParams, SortDirection } from "./types"

export const DATE_FIELDS = ['date', 'time', 'createdat', 'updatedat'] as const
export const TIMESTAMP_13_REGEX = /^\\d{13}$/
export const TIMESTAMP_10_REGEX = /^\\d{10}$/
export const ARRAY_SIZE_OPERATORS = [
    'size_gt', 'size_gte', 'size_lt', 'size_lte', 'size_eq', 'size_ne', 'size_between'
] as const
export const DEFAULT_FIELDS = {
    FILTER: ['createdAt', 'updatedAt', 'deletedAt'],
    SORT: ['createdAt', 'updatedAt'],
    SEARCH: ['name']
} as const

export const MAX_STRING_LENGTH = 10000
export const MAX_ARRAY_SIZE = 1000
export const MAX_QUERY_FIELDS = 100

export class ArraySizeHelper {
    private static readonly ARRAY_SIZE_OPERATORS = [
        'size_gt', 'size_gte', 'size_lt', 'size_lte', 'size_eq', 'size_ne', 'size_between'
    ]

    static parseQuery(
        query: Record<string, any>,
    ): { needsPipeline: boolean; pipeline?: any[], match?: Record<string, any> } {
        const operations: Array<ArraySizeFilter> = []

        Object.keys(query).forEach(key => {
            const match = key.match(/^(.+)__(.+)$/)
            if (match) {
                const [, field, operator] = match
                if (this.ARRAY_SIZE_OPERATORS.includes(operator!)) {
                    let value: number | string | null = null

                    if (operator === 'size_between') {
                        value = query[key]
                    } else {
                        value = this.parseNumericValue(query[key])
                    }

                    if (value !== null) {
                        operations.push({
                            field: field!,
                            operator: operator!,
                            value,
                            countFieldName: \`\${field}Count\`
                        })
                    }
                }
            }
        })

        if (operations.length === 0) {
            return { needsPipeline: false }
        }

        const pipeline: any[] = []

        const addFields: Record<string, any> = {}
        operations.forEach(op => {
            addFields[op.countFieldName] = {
                $size: { $ifNull: [\`$\${op.field}\`, []] }
            }
        })
        pipeline.push({ $addFields: addFields })

        const matchConditions: Record<string, any> = {}
        operations.forEach(op => {
            matchConditions[op.countFieldName] = this.buildMatchCondition(op.operator, op.value)
        })
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions })
        }

        return { needsPipeline: true, pipeline, match: matchConditions }
    }

    private static parseNumericValue(value: string): number | null {
        const numValue = Number(value)
        return !isNaN(numValue) && value !== '' ? numValue : null
    }

    private static buildMatchCondition(operator: string, value: number | string): any {
        switch (operator) {
            case 'size_gt': return { $gt: value }
            case 'size_gte': return { $gte: value }
            case 'size_lt': return { $lt: value }
            case 'size_lte': return { $lte: value }
            case 'size_eq': return { $eq: value }
            case 'size_ne': return { $ne: value }
            case 'size_between': {
                if (typeof value !== 'string') {
                    throw new Error('size_between requires string value format: "min,max"')
                }

                const parts = value.split(',').map(v => v.trim())
                if (parts.length !== 2) {
                    throw new Error('size_between requires format: "min,max"')
                }

                const min = this.parseNumericValue(parts[0] || '0')
                const max = this.parseNumericValue(parts[1] || (min! + 1).toString())

                if (min === null || max === null) {
                    throw new Error('size_between requires valid numeric values')
                }

                return { $gte: min, $lte: max }
            }
            default: return { $eq: value }
        }
    }

    static isArraySizeOperator(operator: string): boolean {
        return this.ARRAY_SIZE_OPERATORS.includes(operator as any)
    }
}

export class ValueParser {
    static parse(field: string, value: string): any {
        if (!value && value !== '') return value

        if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
            throw new Error(\`Input value too long: \${value.length} characters (max: \${MAX_STRING_LENGTH})\`)
        }

        if (this.isExistOperator(value)) {
            return this.parseExistValue(value)
        }

        if (this.isDateField(field)) {
            return this.parseDateValue(value)
        }

        if (this.isObjectIdField(field, value)) {
            return this.parseObjectIdValue(value)
        }

        if (this.isBooleanValue(value)) {
            return this.parseBooleanValue(value)
        }

        const numValue = this.parseNumericValue(value)
        return numValue !== null ? numValue : value
    }

    static parseNumericValue(value: string): number | null {
        if (value === '' || value === null || value === undefined) return null
        const numValue = Number(value)
        return !isNaN(numValue) && isFinite(numValue) && numValue <= Number.MAX_SAFE_INTEGER ? numValue : null
    }

    private static isExistOperator(value: string): boolean {
        return typeof value === 'string' && value.startsWith('$exist:')
    }

    private static parseExistValue(value: string): { $exists: boolean } {
        const parts = value.split(':')
        const boolValue = parts[1]?.toLowerCase() === 'true'
        return { $exists: boolValue }
    }

    private static isDateField(field: string): boolean {
        if (!field || typeof field !== 'string') return false
        const fieldLower = field.toLowerCase()
        return DATE_FIELDS.some(dateField => fieldLower.includes(dateField))
    }

    private static parseDateValue(value: string): Date | string {
        if (TIMESTAMP_13_REGEX.test(value)) {
            const timestamp = parseInt(value)
            if (timestamp >= 0 && timestamp <= 4102444800000) {
                return new Date(timestamp)
            }
        }

        if (TIMESTAMP_10_REGEX.test(value)) {
            const timestamp = parseInt(value)
            if (timestamp >= 0 && timestamp <= 4102444800) {
                return new Date(timestamp * 1000)
            }
        }

        const dateValue = new Date(value)
        return !isNaN(dateValue.getTime()) ? dateValue : value
    }

    private static isObjectIdField(field: string, value: string): boolean {
        if (!field || !value || typeof field !== 'string' || typeof value !== 'string') return false
        return (field.endsWith('Id') || ObjectId.isValid(value)) && value !== ''
    }

    private static parseObjectIdValue(value: string): ObjectId | string {
        try {
            return new ObjectId(value)
        } catch {
            return value
        }
    }

    private static isBooleanValue(value: string): boolean {
        if (typeof value !== 'string') return false
        return ["true", "false"].includes(value.toLowerCase())
    }

    private static parseBooleanValue(value: string): boolean {
        return value.toLowerCase() === "true"
    }
}

export class FilterOperatorHandler {
    private static readonly OPERATORS: Record<string, (field: string, value: string) => any> = {
        gt: (field, value) => ({ $gt: ValueParser.parse(field, value) }),
        gte: (field, value) => ({ $gte: ValueParser.parse(field, value) }),
        lt: (field, value) => ({ $lt: ValueParser.parse(field, value) }),
        lte: (field, value) => ({ $lte: ValueParser.parse(field, value) }),
        ne: (field, value) => ({ $ne: ValueParser.parse(field, value) }),
        in: (field, value) => {
            const values = value.split(',').map(v => ValueParser.parse(field, v.trim())).filter(v => v !== null && v !== undefined && v !== '')
            if (values.length > MAX_ARRAY_SIZE) {
                throw new Error(\`Array too large: \${values.length} items (max: \${MAX_ARRAY_SIZE})\`)
            }
            return values.length > 0 ? { $in: values } : { $in: [] }
        },
        nin: (field, value) => {
            const values = value.split(',').map(v => ValueParser.parse(field, v.trim())).filter(v => v !== null && v !== undefined && v !== '')
            if (values.length > MAX_ARRAY_SIZE) {
                throw new Error(\`Array too large: \${values.length} items (max: \${MAX_ARRAY_SIZE})\`)
            }
            return values.length > 0 ? { $nin: values } : { $nin: [] }
        },
        regex: (_, value) => {
            try {
                new RegExp(value)
                return { $regex: value, $options: 'i' }
            } catch {
                const escapedValue = value.replace(/[.*+?^$\{}()|[\\]\\]/g, '\\$&')
                return { $regex: escapedValue, $options: 'i' }
            }
        },
        exists: (_, value) => ({ $exists: value === 'true' }),
        between: (field, value) => {
            const parts = value.split(',').map(v => v.trim())
            if (parts.length !== 2) {
                throw new Error('between operator requires format: "min,max"')
            }
            const [min, max] = parts.map(v => ValueParser.parse(field, v))
            return { $gte: min, $lte: max }
        }
    }

    static apply(operator: FilterOperator, field: string, value: string): any {
        if (ArraySizeHelper.isArraySizeOperator(operator)) {
            throw new Error(\`Array size operator \${operator} should be handled by ArraySizeHelper\`)
        }

        const handler = this.OPERATORS[operator]
        if (!handler) {
            throw new Error(\`Unsupported filter operator: \${operator}\`)
        }

        return handler(field, value)
    }

    static isValidOperator(operator: string): operator is FilterOperator {
        return operator in this.OPERATORS || ArraySizeHelper.isArraySizeOperator(operator)
    }
}

export class FilterParser {
    private allowedFieldsSet: Set<string>

    constructor(private options: QueryOptions) {
        this.allowedFieldsSet = new Set(this.options.filterFields)
    }

    parse(query: Record<string, any>): FilterParseResult {
        const queryFieldCount = Object.keys(query).length
        const maxFields = this.options.maxQueryFields || MAX_QUERY_FIELDS
        if (queryFieldCount > maxFields) {
            throw new Error(\`Too many query fields: \${queryFieldCount} (max: \${maxFields})\`)
        }

        const filters: Record<string, any> = {}

        const arraySize = ArraySizeHelper.parseQuery(query)

        this.parseArrayFormatFilters(query, filters)
        this.parseDirectFilters(query, filters)
        this.parseOperatorFilters(query, filters)

        return { filters, arraySize }
    }

    private parseArrayFormatFilters(query: Record<string, any>, filters: Record<string, any>): void {
        Object.keys(query).forEach(key => {
            const match = key.match(/^filters\\[(.*?)\\]$/)
            if (match) {
                const field = match[1]
                if (field && this.isAllowedField(field)) {
                    try {
                        const parsedValue = ValueParser.parse(field, query[key])
                        if (filters[field] && typeof filters[field] === 'object' && typeof parsedValue === 'object') {
                            Object.assign(filters[field], parsedValue)
                        } else {
                            filters[field] = parsedValue
                        }
                    } catch (error) {
                        console.warn(\`Array format filter parsing error for \${key}:\`, error)
                    }
                }
            }
        })
    }

    private parseDirectFilters(query: Record<string, any>, filters: Record<string, any>): void {
        this.options.filterFields.forEach(field => {
            if (query[field] !== undefined) {
                try {
                    if (!filters[field]) {
                        filters[field] = ValueParser.parse(field, query[field])
                    }
                } catch (error) {
                    console.warn(\`Direct filter parsing error for \${field}:\`, error)
                }
            }
        })
    }

    private parseOperatorFilters(query: Record<string, any>, filters: Record<string, any>): void {
        Object.keys(query).forEach(key => {
            const match = key.match(/^(.+)__(.+)$/)
            if (!match) return

            const [, field, operatorStr] = match

            if (!field || !operatorStr) return
            if (!this.isAllowedField(field)) return
            if (!FilterOperatorHandler.isValidOperator(operatorStr)) return

            if (ArraySizeHelper.isArraySizeOperator(operatorStr)) {
                return
            }

            try {
                const filterValue = FilterOperatorHandler.apply(
                    operatorStr as FilterOperator,
                    field,
                    query[key]
                )

                if (filters[field] && typeof filters[field] === 'object' && !Array.isArray(filters[field])) {
                    Object.assign(filters[field], filterValue)
                } else {
                    filters[field] = filterValue
                }
            } catch (error) {
                console.warn(\`Operator filter parsing error for \${key}:\`, error)
            }
        })
    }

    private isAllowedField(field: string): boolean {
        if (this.allowedFieldsSet.size === 0) return true
        if (this.allowedFieldsSet.has(field)) return true
        if (this.allowedFieldsSet.has("*")) return true
        if (this.options.filterPrefix && field.startsWith(this.options.filterPrefix)) return true
        return false
    }
}

export class QueryParser {
    private filterParser: FilterParser
    private options: QueryOptions
    private allowedSortFieldsSet: Set<string>

    constructor(serviceOptions?: Partial<QueryOptions>) {
        this.options = {
            searchFields: serviceOptions?.searchFields || [...DEFAULT_FIELDS.SEARCH],
            filterFields: [...new Set([...(serviceOptions?.filterFields || []), ...DEFAULT_FIELDS.FILTER])],
            sortFields: [...new Set([...(serviceOptions?.sortFields || []), ...DEFAULT_FIELDS.SORT])],
            includeFields: serviceOptions?.includeFields || [],
            filterPrefix: serviceOptions?.filterPrefix,
            maxLimit: serviceOptions?.maxLimit || 100,
            defaultSort: serviceOptions?.defaultSort || { createdAt: -1 },
            skipQueryParser: { ...serviceOptions?.skipQueryParser },
            maxQueryFields: serviceOptions?.maxQueryFields || MAX_QUERY_FIELDS,
            maxArraySize: serviceOptions?.maxArraySize || MAX_ARRAY_SIZE
        }

        this.filterParser = new FilterParser(this.options)
        this.allowedSortFieldsSet = new Set(this.options.sortFields)
    }

    parse(query: Record<string, any>): QueryParams {
        const { filters, arraySize } = this.filterParser.parse(query)

        const params: QueryParams = {
            page: Math.max(1, Number(query.page) || 1),
            limit: Math.min(Number(query.limit) || 10, this.options.maxLimit),
            sort: this.parseSort(query),
            search: query.search || query.q || undefined,
            searchFields: this.parseCommaSeparated(query.searchFields),
            filters,
            include: this.parseInclude(query),
            exclude: this.parseCommaSeparated(query.exclude),
            lookup: this.parseCommaSeparated(query.lookup),
            format: query.format as ExportFormat,
            arraySize
        }

        return params
    }

    buildMongoQuery(params: QueryParams): Record<string, any> {
        const query: Record<string, any> = {}

        if (params.search && !this.options.skipQueryParser.search) {
            const searchFields = params.searchFields || this.options.searchFields
            if (searchFields.length > 0) {
                query.$or = searchFields.map(field => ({
                    [field]: { $regex: params.search, $options: 'i' }
                }))
            }
        }

        Object.assign(query, params.filters)
        return query
    }

    buildProjection(params: QueryParams): Record<string, 0 | 1> | undefined {
        if (!params.include && !params.exclude) return undefined

        const projection: Record<string, 0 | 1> = {}

        if (params.include && params.include.length > 0) {
            params.include.forEach(field => projection[field] = 1)
            projection._id = 1
        }

        if (params.exclude && params.exclude.length > 0) {
            params.exclude.forEach(field => projection[field] = 0)
        }

        return Object.keys(projection).length > 0 ? projection : undefined
    }

    private parseSort(query: Record<string, any>): Record<string, SortDirection> {
        if (query.sort) {
            return this.parseCommaFormatSort(query.sort)
        }

        if (query['order[field]'] && query['order[direction]']) {
            return this.parseObjectFormatSort(query['order[field]'], query['order[direction]'])
        }

        return this.options.defaultSort
    }

    private parseCommaFormatSort(sortStr: string): Record<string, SortDirection> {
        if (typeof sortStr !== 'string') return this.options.defaultSort

        const sortObj: Record<string, SortDirection> = {}
        const sortPairs = sortStr.split(',').filter(pair => pair.trim())

        for (const pair of sortPairs) {
            const [field, direction = 'asc'] = pair.split(':')
            const trimmedField = field?.trim()

            if (trimmedField && this.isAllowedSortField(trimmedField)) {
                sortObj[trimmedField] = direction.trim() === 'desc' ? -1 : 1
            }
        }

        return Object.keys(sortObj).length > 0 ? sortObj : this.options.defaultSort
    }

    private parseObjectFormatSort(field: string, direction: string): Record<string, SortDirection> {
        if (!this.isAllowedSortField(field)) {
            return this.options.defaultSort
        }

        return {
            [field]: direction === 'desc' ? -1 : 1
        }
    }

    private parseCommaSeparated(value: string | undefined): string[] | undefined {
        if (!value || typeof value !== 'string') return undefined
        return value.split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0)
    }

    private parseInclude(query: Record<string, any>): string[] | undefined {
        const includes = this.parseCommaSeparated(query.include)
        if (!includes) return undefined

        if (this.options.includeFields.length > 0) {
            return includes.filter(field => this.options.includeFields.includes(field))
        }

        return includes
    }

    private isAllowedSortField(field: string): boolean {
        return this.allowedSortFieldsSet.size === 0 || this.allowedSortFieldsSet.has(field)
    }
}
`
