import { AsyncLocalStorage } from "node:async_hooks";
import * as model from "../models/index.js";

/**
 * Global request context utilizing AsyncLocalStorage.
 * Built via buildRequestContextStore() from user defaults (PUT /user/saveUserDefaults):
 * - defaultInstituteId, instituteId
 * - defaultRole
 * - defaultAcademicYearId, academicYearId
 * - universityId (from institute row via active instituteId)
 * - userId
 * - bypass
 */
export const requestContext = new AsyncLocalStorage();

export function getTenantStore() {
    return requestContext.getStore() ?? {};
}

export async function buildRequestContextStore({
    userId,
    defaultInstituteId,
    defaultRole,
    defaultAcademicYearId,
    bypass = false,
}) {
    let instituteId;
    if (defaultInstituteId != null && defaultInstituteId !== "") {
        instituteId = parseInt(defaultInstituteId, 10);
    }

    let academicYearId;
    if (defaultAcademicYearId != null && defaultAcademicYearId !== "") {
        academicYearId = parseInt(defaultAcademicYearId, 10);
    }

    let universityId;
    if (instituteId) {
        const institute = await model.instituteModel.findOne({
            attributes: ["universityId"],
            where: { instituteId },
        });
        universityId = institute?.universityId;
    }

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
