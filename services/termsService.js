import * as termsRepository from '../repository/termsRepository.js';
import * as sessionRepository from '../repository/sessionRepository.js';
import * as courseRepository from '../repository/courseRepository.js';
import { groupClassSectionsByTerm } from '../utility/classSectionIncludes.js';

function maxTermKey(...maps) {
    let max = 0;
    for (const map of maps) {
        for (const key of Object.keys(map)) {
            const termNum = Number(key);
            if (termNum > max) {
                max = termNum;
            }
        }
    }
    return max;
}

function formatSubjectRow(subject) {
    return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
    };
}

function formatExamSetupTypeTermRow(plain) {
    const setup = plain.examSetupType ?? {};
    return {
        examSetupTypeTermId: plain.examSetupTypeTermId,
        examSetupTypeId: plain.examSetupTypeId,
        examType: setup.examType ?? null,
        examName: setup.examName ?? null,
    };
}

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
            termsRepository.getClassSectionsByCourseAndSession(courseId, sessionId),
            termsRepository.getExamSetupTypeTermsByCourseAndSession(courseId, sessionId, session),
        ]);

        const classSectionsByTerm = groupClassSectionsByTerm(classSections);

        const subjectsByTerm = {};
        for (const subject of subjects) {
            if (!subject.term) continue;
            const termNum = Number(subject.term);
            if (!subjectsByTerm[termNum]) {
                subjectsByTerm[termNum] = [];
            }
            subjectsByTerm[termNum].push(formatSubjectRow(subject));
        }

        const examSetupMap = {};
        for (const estt of examSetupTypeTerms) {
            const plain = estt.get({ plain: true });
            const termNum = Number(plain.term);
            if (!termNum) continue;
            if (!examSetupMap[termNum]) {
                examSetupMap[termNum] = [];
            }
            examSetupMap[termNum].push(formatExamSetupTypeTermRow(plain));
        }

        const maxTermFound = maxTermKey(subjectsByTerm, classSectionsByTerm, examSetupMap);
        const endTerm = totalTerms > 0 ? totalTerms : maxTermFound;

        const terms = [];
        for (let i = 1; i <= endTerm; i++) {
            terms.push({
                term: i,
                termName: `${termType} ${i}`,
                classSections: classSectionsByTerm[i] ?? [],
                subjects: subjectsByTerm[i] ?? [],
                examSetupTypeTerms: examSetupMap[i] ?? [],
            });
        }

        const sessionPlain = session.get({ plain: true });

        return {
            courseId: Number(courseId),
            sessionId: Number(sessionId),
            course: {
                courseId: coursePlain.courseId,
                termType: coursePlain.termType,
                totalTerms: coursePlain.totalTerms,
                courseDuration: coursePlain.courseDuration,
                isActive: coursePlain.isActive,
            },
            session: {
                sessionId: sessionPlain.sessionId,
                academicYearId: sessionPlain.academicYearId,
            },
            terms,
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
                    academicYearId,
                );

            const termsMap = {};

            for (const subject of subjects) {
                const termNumber = Number(subject.term);
                if (!termNumber) continue;

                if (!termsMap[termNumber]) {
                    termsMap[termNumber] = {
                        termName: `${termType} ${termNumber}`,
                        term: termNumber,
                        subjects: [],
                    };
                }

                const subjectRow = { ...subject };
                delete subjectRow.term;
                termsMap[termNumber].subjects.push(subjectRow);
            }

            const termKeys = Object.keys(termsMap).sort((a, b) => Number(a) - Number(b));
            for (const termKey of termKeys) {
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
            }
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

        const termsMap = {};
        for (const estt of examSetupTypeTerms) {
            const plain = estt.get({ plain: true });
            const termNum = Number(plain.term);
            if (!termNum) continue;
            if (!termsMap[termNum]) {
                termsMap[termNum] = [];
            }
            termsMap[termNum].push(plain);
        }

        const maxTermFound = maxTermKey(termsMap);
        const endTerm = totalTerms > 0 ? totalTerms : maxTermFound;

        const result = [];
        for (let i = 1; i <= endTerm; i++) {
            result.push({
                termName: `${termType} ${i}`,
                term: i,
                examSetupTypeTerms: termsMap[i] ?? [],
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
