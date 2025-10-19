export const queryTypesTemplate = `
export type SortDirection = 1 | -1
export type ExportFormat = 'json' | 'csv' | 'xlsx'

export type FilterOperator =
    | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'
    | 'in' | 'nin' | 'regex' | 'exists' | 'between'

export interface QueryParams {
    page: number
    limit: number
    sort: Record<string, SortDirection>
    search?: string
    searchFields?: string[]
    filters: Record<string, any>
    include?: string[]
    exclude?: string[]
    lookup?: string[]
    format?: ExportFormat
    arraySize?: ArraySizeResult
}

export interface ArraySizeFilter {
    field: string
    operator: string
    value: number | string
    countFieldName: string
}

export interface ArraySizeResult {
    needsPipeline: boolean
    pipeline?: any[]
    match?: Record<string, any>
}

export interface FilterParseResult {
    filters: Record<string, any>
    arraySize: ArraySizeResult
}

export interface QueryOptions {
    searchFields: string[]
    filterFields: string[]
    sortFields: string[]
    includeFields: string[]
    filterPrefix?: string
    maxLimit: number
    defaultSort: Record<string, SortDirection>
    skipQueryParser: Partial<Record<keyof QueryParams, boolean>> & { query?: boolean }
    maxQueryFields?: number
    maxArraySize?: number
}
`
