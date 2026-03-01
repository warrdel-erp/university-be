import * as termsRepository from '../repository/termsRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as courseRepository from '../repository/courseRepository.js';
import { getTermsWithSubjectRepo } from '../repository/termsRepository.js';

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

export const getTermsWithSubjectService = async (instituteId, acedmicYearId) => {
    try {

        const [session, courses] = await Promise.all([
            sessionRepository.getSessionByInstituteAndAcademicYear(instituteId, acedmicYearId),
            courseRepository.getAllCourseByInstituteId(instituteId)
        ]);

        if (!session) {
            throw new Error('Session not found');
        }

        if (!courses) {
            throw new Error('Course not found');
        }

        const finalResult = [];

        for (const course of courses) {

            const courseId = course.courseId;
            const termType = course.termType || 'Term';

            const subjects =
                await termsRepository.getSubjectsByCourseAndAcademicYearAndInstitute(
                    courseId,
                    acedmicYearId,
                    instituteId
                );

            const termsMap = {};


            subjects.forEach(subject => {

                const termNumber = Number(subject.term);

                if (!termNumber) return;  // skip invalid

                if (!termsMap[termNumber]) {
                    termsMap[termNumber] = {
                        termName: `${termType} ${termNumber}`,
                        subjects: [],
                    };
                }

                delete subject.term;

                termsMap[termNumber].subjects.push(subject);
            });


            Object.keys(termsMap)
                .sort((a, b) => Number(a) - Number(b))
                .forEach(termKey => {

                    const term = termsMap[termKey];

                    finalResult.push({
                        termName: term.termName,
                        course: {
                            courseId: course.courseId,
                            courseName: course.courseName
                        },
                        subjects: term.subjects
                    });
                });
        }

        return finalResult;

    } catch (error) {
        console.error('Error in getTerms With SubjectService:', error);
        throw error;
    }
};
