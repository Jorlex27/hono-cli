export const aggregateTypesTemplate = `
export interface LookupOptions {
    from: string;
    localField: string;
    foreignField?: string;
    as?: string;
    project?: Record<string, number | boolean>;
    preserveNullAndEmptyArrays?: boolean;
    pipeline?: PipelineStage[];
    let?: Record<string, any>;
    isUnwind?: boolean;
    softDelete?: boolean;
}

export interface LookupRelation {
    collection: string;
    field: string;
    as?: string;
    project?: Record<string, number | boolean>;
    pipeline?: PipelineStage[];
}

export type LookupStage = {
    $lookup: {
        from: string;
        localField: string;
        foreignField: string;
        as: string;
        pipeline?: PipelineStage[];
        let?: Record<string, any>;
    };
};

export type UnwindStage = {
    $unwind: {
        path: string;
        preserveNullAndEmptyArrays?: boolean;
    };
};

export type MatchStage = {
    $match: Record<string, any>;
};

export type ProjectStage = {
    $project: Record<string, any>;
};

export type GroupStage = {
    $group: Record<string, any>;
};

export type SortStage = {
    $sort: Record<string, any>;
};

export type AddFieldsStage = {
    $addFields: Record<string, any>;
};

export type SetStage = {
    $set: Record<string, any>;
};

export type ReplaceRootStage = {
    $replaceRoot: {
        newRoot: string | Record<string, any>;
    };
};

export type FacetStage = {
    $facet: Record<string, PipelineStage[]>;
};

export type PipelineStage =
    | LookupStage
    | UnwindStage
    | MatchStage
    | ProjectStage
    | GroupStage
    | SortStage
    | AddFieldsStage
    | SetStage
    | ReplaceRootStage
    | FacetStage
    | { $limit: number }
    | { $skip: number }
    | { $count: string }
    | { $unset: string[] }
    | { [key: string]: any };
`
