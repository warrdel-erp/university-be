import * as termsRepository from '../repository/termsRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as courseRepository from '../repository/courseRepository.js';
import { resolveProgramTerm } from '../utility/classSectionIncludes.js';
export async function getTermsData(courseId, sessionId) {
    try {
        const mapping = await sessionRepository.getMappingByCourseAndSession(courseId, sessionId);
        if (!mapping) {
            throw new Error('Course session mapping not found');
        }

        const session = await sessionRepository.assertSessionInScope(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const course = await courseRepository.getCourseByCourseId(courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        const coursePlain = course.get({ plain: true });
        const termType = coursePlain.termType || 'Term';
        const totalTerms = Number(coursePlain.totalTerms) || 0;

        const [subjects, classSections, examSetupTypeTerms] = await Promise.all([
            termsRepository.getSubjectsByCourseAndSession(courseId, session),
            termsRepository.getClassSectionsByCourseAndSession(courseId, sessionId, session),
            termsRepository.getExamSetupTypeTermsByCourseAndSession(courseId, sessionId, session),
        ]);

        const plainExamSetupTypeTerms = examSetupTypeTerms.map((e) => e.get({ plain: true }));

        const termsMap = {};
        const examSetupMap = {};

        const ensureTerm = (termNum) => {
            if (!termsMap[termNum]) {
                termsMap[termNum] = {
                    termName: `${termType} ${termNum}`,
                    term: termNum,
                    classSections: [],
                    subjects: [],
                    examSetupTypeTerms: [],
                };
            }
        };

        plainExamSetupTypeTerms.forEach((estt) => {
            const termNum = Number(estt.term);
            if (!termNum) return;
            if (!examSetupMap[termNum]) {
                examSetupMap[termNum] = [];
            }
            examSetupMap[termNum].push(estt);
        });

        subjects.forEach((subject) => {
            if (!subject.term) return;
            const termNum = Number(subject.term);
            ensureTerm(termNum);
            delete subject.term;
            termsMap[termNum].subjects.push(subject);
        });

        classSections.forEach((cs) => {
            const termNum = resolveProgramTerm(cs);
            if (termNum == null) return;
            ensureTerm(Number(termNum));
            delete cs.classSectionTerms;
            termsMap[termNum].classSections.push(cs);
        });

        const maxTermFound = Math.max(
            ...Object.keys(termsMap).map(Number),
            ...Object.keys(examSetupMap).map(Number),
            0,
        );
        const endTerm = totalTerms > 0 ? totalTerms : maxTermFound;

        const result = [];
        for (let i = 1; i <= endTerm; i++) {
            const term = termsMap[i];
            result.push({
                termName: `${termType} ${i}`,
                term: i,
                classSections: term?.classSections || [],
                subjects: term?.subjects || [],
                examSetupTypeTerms: examSetupMap[i] || [],
            });
        }

        const sessionPlain = session.get({ plain: true });

        return {
            result,
            session: {
                sessionId: sessionPlain.sessionId,
                universityId: sessionPlain.universityId,
                instituteId: sessionPlain.instituteId,
                academicYearId: sessionPlain.academicYearId,
            },
            course: {
                universityId: coursePlain.universityId,
                courseDuration: coursePlain.courseDuration,
                isActive: coursePlain.isActive,
                termType: coursePlain.termType,
                totalTerms: coursePlain.totalTerms,
            },
        };
    } catch (error) {
        console.error('Error in getTermsData service:', error);
        throw error;
    }
}

export const getTermsWithSubjectService = async (instituteId, academicYearId) => {
    try {
        const courses = await courseRepository.getAllCourseByInstituteId(instituteId);

        if (!courses?.length) {
            return [];
        }

        const finalResult = [];

        for (const course of courses) {
            const courseId = course.courseId;
            const termType = course.termType || 'Term';

            const subjects =
                await termsRepository.getSubjectsByCourseAndAcademicYearAndInstitute(
                    courseId,
                    instituteId,
                    academicYearId
                );

            const termsMap = {};

            subjects.forEach((subject) => {
                const termNumber = Number(subject.term);
                if (!termNumber) return;

                if (!termsMap[termNumber]) {
                    termsMap[termNumber] = {
                        termName: `${termType} ${termNumber}`,
                        term: termNumber,
                        subjects: [],
                    };
                }

                delete subject.term;
                termsMap[termNumber].subjects.push(subject);
            });

            Object.keys(termsMap)
                .sort((a, b) => Number(a) - Number(b))
                .forEach((termKey) => {
                    const term = termsMap[termKey];

                    finalResult.push({
                        termName: term.termName,
                        term: term.term,
                        academicYearId,
                        course: {
                            courseId: course.courseId,
                            courseName: course.courseName,
                        },
                        subjects: term.subjects,
                    });
                });
        }

        return finalResult;
    } catch (error) {
        console.error('Error in getTerms With SubjectService:', error);
        throw error;
    }
};

export async function getTermsWithExamTypes(courseId, sessionId) {
    try {
        const mapping = await sessionRepository.getMappingByCourseAndSession(courseId, sessionId);
        if (!mapping) {
            throw new Error('Course session mapping not found');
        }

        const session = await sessionRepository.assertSessionInScope(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const course = await courseRepository.getCourseByCourseId(courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        const coursePlain = course.get({ plain: true });
        const termType = coursePlain.termType || 'Term';
        const totalTerms = Number(coursePlain.totalTerms) || 0;

        const examSetupTypeTerms = await termsRepository.getExamSetupTypeTermsByCourseAndSession(
            courseId,
            sessionId,
            session,
        );

        const plainExamSetupTypeTerms = examSetupTypeTerms.map((e) => e.get({ plain: true }));

        const termsMap = {};
        plainExamSetupTypeTerms.forEach((estt) => {
            const termNum = Number(estt.term);
            if (!termsMap[termNum]) {
                termsMap[termNum] = [];
            }
            termsMap[termNum].push(estt);
        });

        const maxTermFound = Object.keys(termsMap).reduce(
            (max, curr) => Math.max(max, Number(curr)),
            0,
        );
        const endTerm = totalTerms > 0 ? totalTerms : maxTermFound;

        const result = [];
        for (let i = 1; i <= endTerm; i++) {
            result.push({
                termName: `${termType} ${i}`,
                term: i,
                examSetupTypeTerms: termsMap[i] || [],
            });
        }

        return {
            result,
            course: {
                universityId: coursePlain.universityId,
                courseDuration: coursePlain.courseDuration,
                isActive: coursePlain.isActive,
                termType: coursePlain.termType,
                totalTerms: coursePlain.totalTerms,
            },
        };
    } catch (error) {
        console.error('Error in getTermsWithExamTypes service:', error);
        throw error;
    }
}
