import * as examScheduleRepository from '../repository/examScheduleRepository.js';

export async function getExamSchedules(universityId, acedmicYearId, instituteId, filters) {
    const result = await examScheduleRepository.getExamSchedules(universityId, acedmicYearId, instituteId, filters);

    if (result && result.length > 0) {
        const sessions = [...new Set(result.map(r => r.sessionId))];
        const courses = [...new Set(result.map(r => r.examSetupTypeTerm?.courseId).filter(Boolean))];
        const terms = [...new Set(result.map(r => r.examSetupTypeTerm?.term).filter(Boolean))];
        const acedmicYears = [...new Set(result.map(r => r.acedmicYearId))];

        if (sessions.length > 0 && courses.length > 0 && terms.length > 0) {
            const counts = await examScheduleRepository.getStudentCountsByGroups(sessions, courses, terms, acedmicYears);

            result.forEach(schedule => {
                const term = schedule.examSetupTypeTerm?.term;
                const courseId = schedule.examSetupTypeTerm?.courseId;
                const sessionId = schedule.sessionId;
                const acedmicYearId = schedule.acedmicYearId;

                const countObj = counts.find(c =>
                    c.sessionId === sessionId &&
                    c.term === term &&
                    c.courseId === courseId &&
                    c.acedmicYearId === acedmicYearId
                );
                schedule.setDataValue('studentCount', countObj ? parseInt(countObj.studentCount) : 0);
            });
        } else {
            result.forEach(schedule => {
                schedule.setDataValue('studentCount', 0);
            });
        }
    }

    return result;
}

export async function getExamScheduleById(examScheduleId) {
    const result = await examScheduleRepository.getExamScheduleById(examScheduleId);

    if (result) {
        const term = result.examSetupTypeTerm?.term;
        const courseId = result.examSetupTypeTerm?.courseId;
        const sessionId = result.sessionId;
        const acedmicYearId = result.acedmicYearId;

        if (term && courseId && sessionId) {
            const count = await examScheduleRepository.getStudentCountByGroup(sessionId, courseId, term, acedmicYearId);
            result.setDataValue('studentCount', count);
        } else {
            result.setDataValue('studentCount', 0);
        }
    }

    return result;
}
