export const paginationTemplate = `import { getTahunAjaran } from "@/modules/tahun-ajaran/tahun-ajaran.get";
import { Context } from "hono";
import { ObjectId } from "mongodb";

export interface SearchParams {
    field: string;
    value: string;
}

export interface OrderParams {
    field: string;
    direction: "asc" | "desc";
}

export interface QueryParams {
    page: number;
    limit: number;
    order: OrderParams;
    tahunAjaranId?: string;
    search: SearchParams;
    role?: string;
    exist?: boolean;
    filters: Record<string, string>;
    include?: string[]
    [key: string]: any;
}

/**
 * Extracts and parses pagination parameters from the request context
 */
export const getPaginationParams = async (c: Context): Promise<QueryParams> => {
    const params = c.req.query();
    const defaultTahunAjaran = await getTahunAjaran();

    // Extract filters from query parameters
    const filters: Record<string, string> = {};
    Object.keys(params).forEach((key) => {
        const filterMatch = key.match(/^filters\[(.*?)\]$/);
        if (filterMatch && params[key]) {
            filters[filterMatch[1] as string] = params[key];
        }
    });

    // Build search params
    const search: SearchParams = {
        field: params['search[field]'] || "",
        value: params['search[value]'] || ""
    };

    // Build order params
    const order: OrderParams = {
        field: params['order[field]'] || "name",
        direction: (params['order[direction]'] || "asc") as "asc" | "desc"
    };

    return {
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        order,
        tahunAjaranId: params.tahunAjaranId || (defaultTahunAjaran ? defaultTahunAjaran.toString() : undefined),
        search,
        role: params.role,
        exist: params.exist === 'true',
        filters,
        include: params.include ? params.include.split(',') : undefined
    };
};

/**
 * Parses price filter values based on various formats
 */
const parsePriceFilter = (filterValue: string): Record<string, any> => {
    if (filterValue === 'asc' || filterValue === 'desc' || filterValue === 'all') {
        return { $exists: true };
    }

    if (filterValue.startsWith('lte:')) {
        return { $lte: Number(filterValue.split(':')[1]) };
    }

    if (filterValue.startsWith('gte:')) {
        return { $gte: Number(filterValue.split(':')[1]) };
    }

    if (filterValue.startsWith('between:')) {
        const [, minValue, maxValue] = filterValue.split(':');
        return {
            $gte: Number(minValue),
            $lte: Number(maxValue)
        };
    }

    const numValue = Number(filterValue);
    return isNaN(numValue) ? filterValue as any : numValue as any;
};

/**
 * Builds MongoDB query from query parameters
 */
export const buildMongoQuery = async (
    params: QueryParams,
    option: Record<string, any> = { tahunAjaranId: true }
): Promise<Record<string, any>> => {
    const query: Record<string, any> = {};

    if (params.search.value && params.search.field) {
        query[params.search.field] = { $regex: params.search.value, $options: "i" };
    }

    if (params.search.value && !params.search.field) {
        query.$or = [
            { name: { $regex: params.search.value, $options: 'i' } },
            { sentralId: { $regex: params.search.value, $options: 'i' } },
            { "address.dusun": { $regex: params.search.value, $options: 'i' } },
            { "address.kecamatan": { $regex: params.search.value, $options: 'i' } },
            { "address.kabupaten": { $regex: params.search.value, $options: 'i' } }
        ];
    }

    if (params.role) {
        query.role = params.role;
    }

    if (option.tahunAjaranId && params.tahunAjaranId) {
        query.tahunAjaranId = new ObjectId(params.tahunAjaranId);
    }

    if (Object.keys(params.filters).length > 0) {
        for (const [key, value] of Object.entries(params.filters)) {
            if (!value) continue;

            if (value.startsWith('lte:') ||
                value.startsWith('gte:') ||
                value.startsWith('between:') ||
                value === 'asc' ||
                value === 'desc' ||
                value === 'all') {
                query[key] = parsePriceFilter(value);
                continue;
            }

            // Handle ObjectId fields (ending with Id and not containing a dot)
            if ((key.endsWith('Id') || ObjectId.isValid(value)) && !key.includes('.')) {
                try {
                    query[key] = new ObjectId(value);
                    continue;
                } catch (e) {
                    // Not a valid ObjectId, continue to boolean/string handling
                }
            }

            if (typeof value === 'string' && ["true", "false"].includes(value.toLowerCase())) {
                query[key] = value.toLowerCase() === "true";
            } else {
                query[key] = value;
            }
        }
    }

    return query;
};

/**
 * Builds MongoDB sort object from query parameters
 */
export const buildMongoSort = (params: QueryParams): Record<string, 1 | -1> => {
    let sortField = params.order.field || "createdAt";
    let sortDirection = params.order.direction === "desc" ? -1 : 1;

    if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
            if (value === 'asc') {
                sortField = key;
                sortDirection = 1;
                break;
            } else if (value === 'desc') {
                sortField = key;
                sortDirection = -1;
                break;
            }
        }
    }

    return { [sortField]: sortDirection } as Record<string, 1 | -1>;
};`