import { getScopeFilter as coursePolicy } from './course.policy.js';
import { getScopeFilter as academicYearPolicy } from './academicYear.policy.js';
import { getScopeFilter as codeMasterPolicy } from './codeMaster.policy.js';
import { getScopeFilter as sessionPolicy } from './session.policy.js';
import { getScopeFilter as departmentPolicy } from './department.policy.js';
import { getScopeFilter as organogramPolicy } from './organogram.policy.js';
import { getScopeFilter as headPolicy } from './head.policy.js';
import { getScopeFilter as governanceBodyPolicy } from './governanceBody.policy.js';

export const policies = {
    course: coursePolicy,
    academicYear: academicYearPolicy,
    codeMaster: codeMasterPolicy,
    session: sessionPolicy,
    department: departmentPolicy,
    organogram: organogramPolicy,
    head: headPolicy,
    governanceBody: governanceBodyPolicy
};
