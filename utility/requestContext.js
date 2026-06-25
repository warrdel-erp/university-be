import { AsyncLocalStorage } from "node:async_hooks";
import * as model from "../models/index.js";

/**
 * Global request context utilizing AsyncLocalStorage.
 * Populated from user defaults saved via PUT /user/saveUserDefaults:
 * - defaultInstituteId, instituteId (active institute)
 * - defaultRole
 * - defaultAcademicYearId, academicYearId (active academic year)
 * - universityId (resolved from defaultInstituteId)
 * - userId
 * - bypass (if true, bypasses scope filters)
 */
export const requestContext = new AsyncLocalStorage();

export function getTenantStore() {
    return requestContext.getStore() ?? {};
}

function parseId(value) {
    if (value == null || value === "") {
        return undefined;
    }
    return parseInt(value, 10);
}

function buildStore({ defaultInstituteId, defaultRole, defaultAcademicYearId, universityId, userId, bypass }) {
    const instituteId = parseId(defaultInstituteId);
    const academicYearId = parseId(defaultAcademicYearId);

    return {
        defaultInstituteId: instituteId,
        instituteId,
        defaultRole: defaultRole || undefined,
        defaultAcademicYearId: academicYearId,
        academicYearId,
        universityId,
        userId,
        bypass: bypass === true,
    };
}

export async function resolveUniversityIdFromInstitute(instituteId) {
    const parsedId = parseId(instituteId);
    if (!parsedId) {
        return undefined;
    }
    const institute = await model.instituteModel.findOne({
        attributes: ["universityId"],
        where: { instituteId: parsedId },
    });
    return institute?.universityId;
}

export function buildContextStore(user, universityId, bypass = false) {
    return buildStore({
        defaultInstituteId: user.defaultInstituteId,
        defaultRole: user.defaultRole,
        defaultAcademicYearId: user.defaultAcademicYearId,
        universityId,
        userId: user.userId,
        bypass,
    });
}

export function buildContextStoreFromDefaults(defaults, userId, universityId, bypass = false) {
    return buildStore({
        defaultInstituteId: defaults.defaultInstituteId,
        defaultRole: defaults.defaultRole,
        defaultAcademicYearId: defaults.defaultAcademicYearId,
        universityId,
        userId,
        bypass,
    });
}
