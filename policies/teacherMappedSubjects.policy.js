import { Op } from "sequelize";
import { SCOPES } from "../const/scopes.js";

export const teacherMappedSubjectsPolicies = {
    [SCOPES.UNIVERSITY]: (targets) => ({ universityId: { [Op.in]: targets } }),
    [SCOPES.CAMPUS]: (targets) => ({ campusId: { [Op.in]: targets } }),
    [SCOPES.INSTITUTE]: (targets) => ({ instituteId: { [Op.in]: targets } }),
    [SCOPES.DEPARTMENT]: (targets) => ({ departmentId: { [Op.in]: targets } })
};

export function getScopeFilter(user, scope, targets) {
    if (targets === 'ALL') return {};
    if (!targets || targets.length === 0) return { id: -1 };

    const policyFn = teacherMappedSubjectsPolicies[scope];
    if (policyFn) {
        return policyFn(targets, user);
    }

    return { id: -1 };
}
