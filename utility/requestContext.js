import { AsyncLocalStorage } from "node:async_hooks";
import * as model from "../models/index.js";

/**
 * Global request context utilizing AsyncLocalStorage.
 * Built via buildRequestContextStore() from user defaults (PUT /user/saveUserDefaults):
 * - defaultInstituteId, instituteId
 * - defaultRole
 * - defaultAcademicYearId, academicYearId
 * - universityId (from user or institute row)
 * - userId
 * - bypass
 */
export const requestContext = new AsyncLocalStorage();

export function getTenantStore() {
    return requestContext.getStore() ?? {};
}

/** Active academic year from user defaults / request context. */
export function getAcademicYearId() {
    return getTenantStore().academicYearId;
}

export async function buildRequestContextStore({
    userId,
    defaultInstituteId,
    defaultRole,
    defaultAcademicYearId,
    universityId: universityIdFromUser,
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
    let campusId;

    if (universityIdFromUser != null && universityIdFromUser !== "") {
        universityId = parseInt(universityIdFromUser, 10);
    }

    // Resolve campusId and universityId from institute if not already known
    if (instituteId) {
        const institute = await model.instituteModel.findByPk(instituteId, {
            attributes: ["universityId", "campusId"],
        });
        if (institute) {
            if (!universityId) {
                universityId = institute.universityId ?? institute.get?.("universityId");
            }
            campusId = institute.campusId ?? institute.get?.("campusId");
        }
    }

    return {
        defaultInstituteId: instituteId,
        instituteId,
        defaultRole: defaultRole || undefined,
        defaultAcademicYearId: academicYearId,
        academicYearId,
        universityId,
        campusId,
        userId,
        bypass: bypass === true,
    };
}
