import * as termsRepository from '../repository/termsRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as courseRepository from '../repository/courseRepository.js';

export async function getTermsData(courseId, sessionId) {
    try {
        // 1. Get session and course to find academicYearId and termType
        const [session, course] = await Promise.all([
            sessionRepository.getSingleSessionDetails(sessionId),
            courseRepository.getCourseByCourseId(courseId)
        ]);

        if (!session) {
            throw new Error('Session not found');
        }
        if (!course) {
            throw new Error('Course not found');
        }

        const acedmicYearId = session.acedmicYearId;
        const termType = course.termType || 'Term';

        // 2. Fetch subjects and class sections
        const [subjects, classSections] = await Promise.all([
            termsRepository.getSubjectsByCourseAndAcademicYear(courseId, acedmicYearId),
            termsRepository.getClassSectionsByCourseAndSession(courseId, sessionId)
        ]);

        // 3. Group by term
        const termsMap = {};

        // Process subjects
        subjects.forEach(subject => {
            if (subject.term) {
                const termNum = subject.term;
                if (!termsMap[termNum]) {
                    termsMap[termNum] = {
                        termName: `${termType} ${termNum}`,
                        term: termNum,
                        classSections: [],
                        subjects: []
                    };
                }

                delete subject.term;
                termsMap[termNum].subjects.push(subject);
            }
        });

        // Process class sections
        classSections.forEach(cs => {
            if (cs.classGroup && cs.classGroup.term) {
                const termNum = cs.classGroup.term;
                if (!termsMap[termNum]) {
                    termsMap[termNum] = {
                        termName: `${termType} ${termNum}`,
                        term: termNum,
                        classSections: [],
                        subjects: []
                    };
                }

                delete cs.classGroup;
                termsMap[termNum].classSections.push(cs);
            }
        });

        // Convert map to sorted array
        const result = Object.keys(termsMap)
            .sort((a, b) => a - b)
            .map(termNum => termsMap[termNum]);

        return { result, session, course };
    } catch (error) {
        console.error('Error in getTermsData service:', error);
        throw error;
    }
}
