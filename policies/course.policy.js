import { Op } from "sequelize";
import { SCOPES } from "../const/scopes.js";
import sequelize from "../database/sequelizeConfig.js";

export const coursePolicies = {
    [SCOPES.UNIVERSITY]: (targets) => ({ universityId: { [Op.in]: targets } }),
    [SCOPES.CAMPUS]: (targets) => ({ campusId: { [Op.in]: targets } }),
    [SCOPES.INSTITUTE]: (targets) => ({ instituteId: { [Op.in]: targets } }),
    [SCOPES.DEPARTMENT]: (targets) => ({ departmentId: { [Op.in]: targets } }),
    [SCOPES.OWN]: (targets, user) => ({
        courseId: {
            [Op.in]: sequelize.literal(`(
                SELECT s.course_id 
                FROM subject s 
                JOIN time_table_cell_date_wise cdw ON cdw.subject_id = s.subject_id 
                JOIN time_table_cell_teachers_date_wise ctw ON ctw.time_table_cell_date_wise_id = cdw.time_table_cell_date_wise_id 
                WHERE ctw.user_id = ${user.id}
            )`)
        }
    })
};

export function getScopeFilter(user, scope, targets) {
    if (targets === 'ALL') return {};
    if (!targets || targets.length === 0) return { id: -1 };

    const policyFn = coursePolicies[scope];
    if (policyFn) {
        return policyFn(targets, user);
    }

    return { id: -1 };
}
