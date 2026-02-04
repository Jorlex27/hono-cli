export const aggregateBuilderTemplate = `
import { ApiError } from '../errors';
import { LookupOptions, LookupRelation, LookupStage, PipelineStage, UnwindStage } from './types';

export class AggregateBuilder {
    private pipeline: PipelineStage[] = [];
    private defaultSoftDelete: boolean = false;

    constructor(defaultSoftDelete: boolean = false) {
        this.pipeline = [];
        this.defaultSoftDelete = defaultSoftDelete;
    }

    /**
     * Add $unwind stage
     */
    unwind(path: string, preserveNullAndEmptyArrays: boolean = true) {
        this.pipeline.push({
            $unwind: {
                path: path.startsWith('$') ? path : \`$\${path}\`,
                preserveNullAndEmptyArrays,
            },
        });
        return this;
    }

    /**
     * Add $match stage
     */
    match(query: Record<string, any>) {
        this.pipeline.push({ $match: query });
        return this;
    }

    /**
     * Add $match with $expr
     */
    matchExpr(expr: Record<string, any>) {
        this.pipeline.push({
            $match: {
                $expr: expr,
            },
        });
        return this;
    }

    /**
     * Add $lookup with project and unwind
     */
    lookup(options: LookupOptions) {
        const {
            from,
            localField,
            foreignField = '_id',
            as = localField.replace('Id', ''),
            project = { _id: 1, name: 1 },
            preserveNullAndEmptyArrays = true,
            pipeline: customPipeline,
            let: letVariables,
            isUnwind = true,
            softDelete,
        } = options;

        const shouldApplySoftDelete = softDelete ?? this.defaultSoftDelete;
        const softDeleteMatch = shouldApplySoftDelete
            ? { $match: { deletedAt: { $exists: false } } }
            : null;

        const lookupStage: LookupStage = {
            $lookup: {
                from,
                localField,
                foreignField,
                as,
                ...(letVariables && { let: letVariables }),
            },
        };

        if (customPipeline) {
            lookupStage.$lookup.pipeline = [
                ...(softDeleteMatch ? [softDeleteMatch] : []),
                ...customPipeline,
            ];
        } else {
            lookupStage.$lookup.pipeline = [
                ...(softDeleteMatch ? [softDeleteMatch] : []),
                { $project: project },
            ];
        }

        this.pipeline.push(lookupStage);

        if (isUnwind) {
            const unwindStage: UnwindStage = {
                $unwind: {
                    path: \`$\${as}\`,
                    preserveNullAndEmptyArrays,
                },
            };
            this.pipeline.push(unwindStage);
        }

        return this;
    }

    /**
     * Add nested lookup (lookup inside lookup)
     */
    nestedLookup(parentAs: string, options: LookupOptions) {
        const {
            from,
            localField,
            foreignField = '_id',
            as = localField.replace('Id', ''),
            project = { _id: 1, name: 1 },
            pipeline: customPipeline,
            isUnwind = true,
            preserveNullAndEmptyArrays = true,
            softDelete,
        } = options;

        const shouldApplySoftDelete = softDelete ?? this.defaultSoftDelete;
        const softDeleteMatch = shouldApplySoftDelete
            ? { $match: { deletedAt: { $exists: false } } }
            : null;

        const lastLookupIndex = this.pipeline.findIndex(
            (stage) => isLookupStage(stage) && stage.$lookup.as === parentAs
        );

        if (lastLookupIndex === -1) {
            throw ApiError.badRequest(\`Parent lookup '\${parentAs}' not found\`);
        }

        const parentStage = this.pipeline[lastLookupIndex];
        if (!isLookupStage(parentStage)) {
            throw ApiError.badRequest('Invalid pipeline stage type');
        }

        if (!parentStage.$lookup.pipeline) {
            parentStage.$lookup.pipeline = [];
        }

        const nestedLookupStage: LookupStage = {
            $lookup: {
                from,
                localField,
                foreignField,
                as,
                pipeline: customPipeline
                    ? [
                          ...(softDeleteMatch ? [softDeleteMatch] : []),
                          ...customPipeline,
                      ]
                    : [
                          ...(softDeleteMatch ? [softDeleteMatch] : []),
                          { $project: project },
                      ],
            },
        };

        parentStage.$lookup.pipeline.push(nestedLookupStage);

        if (isUnwind) {
            const nestedUnwindStage: UnwindStage = {
                $unwind: {
                    path: \`$\${as}\`,
                    preserveNullAndEmptyArrays,
                },
            };
            parentStage.$lookup.pipeline.push(nestedUnwindStage);
        }

        return this;
    }

    /**
     * Add multiple lookups from relations array
     */
    lookupRelations(relations: LookupRelation[]) {
        for (const relation of relations) {
            this.lookup({
                from: relation.collection,
                localField: relation.field,
                as: relation.as || relation.field.replace('Id', ''),
                project: relation.project,
                pipeline: relation.pipeline,
            });
        }
        return this;
    }

    /**
     * Add $facet stage for multiple pipelines
     */
    facet(facets: Record<string, PipelineStage[]>) {
        this.pipeline.push({ $facet: facets });
        return this;
    }

    /**
     * Add $addFields stage
     */
    addFields(fields: Record<string, any>) {
        this.pipeline.push({ $addFields: fields });
        return this;
    }

    /**
     * Add $set stage (alias for $addFields)
     */
    set(fields: Record<string, any>) {
        this.pipeline.push({ $set: fields });
        return this;
    }

    /**
     * Add $unset stage
     */
    unset(fields: string | string[]) {
        this.pipeline.push({ $unset: Array.isArray(fields) ? fields : [fields] });
        return this;
    }

    /**
     * Add $group stage
     */
    group(groupStage: Record<string, any>) {
        this.pipeline.push({ $group: groupStage });
        return this;
    }

    /**
     * Replace root document
     */
    replaceRoot(newRoot: string | Record<string, any>) {
        this.pipeline.push({ $replaceRoot: { newRoot } });
        return this;
    }

    /**
     * Add $sort stage
     */
    sort(sort: Record<string, 1 | -1>) {
        this.pipeline.push({ $sort: sort });
        return this;
    }

    /**
     * Add $skip stage
     */
    skip(value: number) {
        this.pipeline.push({ $skip: value });
        return this;
    }

    /**
     * Add $limit stage
     */
    limit(value: number) {
        this.pipeline.push({ $limit: value });
        return this;
    }

    /**
     * Add $project stage
     */
    project(fields: Record<string, string | number | object>) {
        if (Object.keys(fields).length > 0) {
            this.pipeline.push({ $project: fields });
        }
        return this;
    }

    /**
     * Add $count stage
     */
    count(field: string = 'count') {
        this.pipeline.push({ $count: field });
        return this;
    }

    /**
     * Add custom stage
     */
    addStage(stage: PipelineStage) {
        this.pipeline.push(stage);
        return this;
    }

    /**
     * Add raw stage (alias for addStage)
     */
    raw(stage: Record<string, any>) {
        this.pipeline.push(stage);
        return this;
    }

    /**
     * Get built pipeline
     */
    build(): PipelineStage[] {
        return this.pipeline;
    }

    /**
     * Reset pipeline
     */
    reset(): this {
        this.pipeline = [];
        return this;
    }
}

function isLookupStage(stage?: PipelineStage): stage is LookupStage {
    if (!stage) return false;
    return '$lookup' in stage;
}
`
