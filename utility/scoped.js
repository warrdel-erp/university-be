
import { requestContext } from "./requestContext.js";

const ACADEMIC_YEAR_FIELD = "acedmicYearId";

export function buildScope(model) {
    const store = requestContext.getStore();

    if (!store || store.bypass) {
        return {};
    }

    const attrs = model.rawAttributes || {};
    const config = model.scopeConfig || {};

    const where = {};

    // DEFAULT → institute scope
    if ("instituteId" in attrs) {
        if (!store.instituteId) {
            throw new Error("Institute missing");
        }

        where.instituteId =
            store.instituteId;
    }

    // OPTIONAL → academic year scope
    if (
        config.academicYear === true &&
        ACADEMIC_YEAR_FIELD in attrs
    ) {
        if (!store.academicYearId) {
            throw new Error(
                "Academic year missing"
            );
        }

        where[
            ACADEMIC_YEAR_FIELD
        ] = store.academicYearId;
    }

    // OPTIONAL → teacher scope
    if (
        store.role === "teacher" &&
        (
            config.teacherRestricted === true
        )
    ) {
        const field =
            "teacherId" in attrs
                ? "teacherId"
                : "userId";

        where[field] =
            store.userId;
    }

    return where;
}

function mergeWhere(scope, where = {}) {
    return {
        ...where,
        ...scope,
    };
}

export function scoped(model) {
    const scope =
        buildScope(model);

    return {
        findAll: (options = {}) =>
            model.findAll({
                ...options,
                where: mergeWhere(
                    scope,
                    options.where
                ),
            }),

        findOne: (options = {}) =>
            model.findOne({
                ...options,
                where: mergeWhere(
                    scope,
                    options.where
                ),
            }),

        findByPk: (
            id,
            options = {}
        ) =>
            model.findOne({
                ...options,
                where: mergeWhere(
                    scope,
                    {
                        ...(options.where || {}),
                        [
                            model.primaryKeyAttribute ||
                            "id"
                        ]: id,
                    }
                ),
            }),

        create: (
            data,
            options = {}
        ) =>
            model.create(
                {
                    ...data,
                    ...scope,
                },
                options
            ),

        update: (
            data,
            options = {}
        ) =>
            model.update(
                data,
                {
                    ...options,
                    where:
                        mergeWhere(
                            scope,
                            options.where
                        ),
                }
            ),

        destroy: (
            options = {}
        ) =>
            model.destroy({
                ...options,
                where:
                    mergeWhere(
                        scope,
                        options.where
                    ),
            }),

        count: (
            options = {}
        ) =>
            model.count({
                ...options,
                where:
                    mergeWhere(
                        scope,
                        options.where
                    ),
            }),
    };
}

