import { getScopeFilter as coursePolicy } from './course.policy.js';
import { getScopeFilter as academicYearPolicy } from './academicYear.policy.js';
import { getScopeFilter as codeMasterPolicy } from './codeMaster.policy.js';
import { getScopeFilter as sessionPolicy } from './session.policy.js';

export const policies = {
    course: coursePolicy,
    academicYear: academicYearPolicy,
    codeMaster: codeMasterPolicy,
    session: sessionPolicy
};
