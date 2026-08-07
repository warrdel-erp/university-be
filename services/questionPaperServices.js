import * as questionPaperRepository from "../repository/questionPaperRepository.js";
import * as questionPaperBlueprintRepository from "../repository/questionPaperBlueprintRepository.js";
import * as questionBankRepository from "../repository/questionBankRepository.js";
import * as subjectRepository from "../repository/subjectRepository.js";
import { questionStatus } from "../constant.js";

/**
 * Calculates total marks from all sections of a question paper.
 * Sums the actual marks of each individual question across all sections.
 * @param {Array} questionPaper - Array of section objects
 * @returns {number}
 */
function calculateTotalMarks(questionPaper) {
    if (!Array.isArray(questionPaper)) return 0;
    return questionPaper.reduce((total, section) => {
        if (!Array.isArray(section.questions)) return total;
        return total + section.questions.reduce((sectionTotal, question) => {
            return sectionTotal + (question.marks || 0);
        }, 0);
    }, 0);
}

export async function addQuestionPaper(questionPaperData, createdBy, updatedBy) {
    const { examScheduleId } = questionPaperData;

    // 1. Check if examSchedule exists
    const examSchedule = await questionPaperRepository.getExamScheduleById(examScheduleId);
    if (!examSchedule) {
        throw new Error(`Exam schedule with id ${examScheduleId} not found`);
    }

    questionPaperData.createdBy = createdBy;
    questionPaperData.updatedBy = updatedBy;
    questionPaperData.totalMarks = calculateTotalMarks(questionPaperData.questionPaper);
    const result = await questionPaperRepository.addQuestionPaper(questionPaperData);
    return result;
}

export async function getQuestionPapers(filters, pagination) {
    return await questionPaperRepository.getQuestionPapers(filters, pagination);
}

function transformQuestionPaper(paper, schedule) {
    let sections = [];
    if (paper.questionPaper) {
        let parsed = paper.questionPaper;
        if (typeof parsed === "string") {
            try {
                parsed = JSON.parse(parsed);
            } catch (err) {
                throw new Error("Invalid question paper JSON structure");
            }
        }
        if (Array.isArray(parsed)) {
            sections = parsed.map(section => {
                const questions = Array.isArray(section.questions)
                    ? section.questions.map(q => {
                        const {
                            universityId,
                            subjectId,
                            content,
                            status,
                            createdBy,
                            updatedBy,
                            createdAt,
                            updatedAt,
                            Answer,
                            answer,
                            ...rest
                        } = q;
                        return {
                            ...rest,
                            answer: Answer !== undefined ? Answer : answer
                        };
                    })
                    : [];
                return {
                    sectionName: section.sectionName,
                    typeOfQuestions: section.typeOfQuestions,
                    marksPerQuestion: section.marksPerQuestion,
                    questions
                };
            });
        }
    }

    let transformedSchedule = null;
    if (schedule) {
        const plainSched = schedule.get ? schedule.get({ plain: true }) : schedule;
        transformedSchedule = {
            examScheduleId: plainSched.examScheduleId,
            subjectId: plainSched.subjectId,
            term: plainSched.term,
            academicYearId: plainSched.academicYearId,
            sessionId: plainSched.sessionId,
            examinationSessionId: plainSched.examinationSessionId,
            examinationSessionSlotId: plainSched.examinationSessionSlotId,
            examDate: plainSched.examDate,
            examTime: plainSched.examTime,
            type: plainSched.type,
            duration: plainSched.duration != null ? Number(plainSched.duration) : null
        };
    }

    return {
        id: paper.id,
        name: paper.name,
        examScheduleId: paper.examScheduleId,
        blueprintId: paper.blueprintId,
        status: paper.status,
        totalMarks: paper.totalMarks,
        sections,
        creator: paper.creator || null,
        examSchedule: transformedSchedule,
        createdAt: paper.createdAt,
        updatedAt: paper.updatedAt
    };
}

export async function getSingleQuestionPaper(id) {
    const paper = await questionPaperRepository.getSingleQuestionPaper(id);
    if (!paper) return null;

    const schedule = paper.examScheduleId
        ? await questionPaperRepository.getExamScheduleById(paper.examScheduleId)
        : null;

    return transformQuestionPaper(paper, schedule);
}

export async function updateQuestionPaper(id, questionPaperData, updatedBy) {
    questionPaperData.updatedBy = updatedBy;
    if (Array.isArray(questionPaperData.questionPaper)) {
        questionPaperData.totalMarks = calculateTotalMarks(questionPaperData.questionPaper);
    }
    return await questionPaperRepository.updateQuestionPaper(id, questionPaperData);
}

export async function deleteQuestionPaper(id) {
    return await questionPaperRepository.deleteQuestionPaper(id);
}

export async function generateQuestionPaper(name, blueprintId, examScheduleId, numberOfPapers, createdBy, updatedBy) {
    try {
        // 1. Fetch blueprint
        const blueprintRecord = await questionPaperBlueprintRepository.getBlueprintById(blueprintId);
        if (!blueprintRecord) {
            throw new Error(`Blueprint with id ${blueprintId} not found`);
        }
        let blueprintSections = blueprintRecord.blueprint;
        if (typeof blueprintSections === 'string') {
            try {
                blueprintSections = JSON.parse(blueprintSections);
            } catch (e) {
                throw new Error("Invalid blueprint format in database.");
            }
        }

        // 2. Fetch exam schedule
        const examSchedule = await questionPaperRepository.getExamScheduleById(examScheduleId);
        if (!examSchedule) {
            throw new Error(`Exam schedule with id ${examScheduleId} not found`);
        }

        const generatedPapers = [];

        // Loop for the requested number of papers
        for (let i = 0; i < numberOfPapers; i++) {
            // 3. For each section, select questions
            const generatedPaper = [];
            for (const section of blueprintSections) {
                const { typeOfQuestions, totalQuestions, marksPerQuestion, sectionName } = section;

                // Randomly fetch approved questions from bank
                const questions = await questionBankRepository.getRandomQuestions(
                    blueprintRecord.subjectId,
                    typeOfQuestions,
                    marksPerQuestion,
                    totalQuestions
                );

                if (questions.length < totalQuestions) {
                    const error = new Error(`Not enough approved questions found for section ${sectionName}. Expected ${totalQuestions}, got ${questions.length}`);
                    error.statusCode = 400;
                    throw error;
                }

                generatedPaper.push({
                    sectionName,
                    typeOfQuestions,
                    marksPerQuestion,
                    questions: questions, // Full objects
                });
            }

            // 4. Create question paper data object
            const currentName = numberOfPapers > 1 ? `${name} - Version ${i + 1}` : name;

            const questionPaperData = {
                name: currentName,
                examScheduleId,
                blueprintId,
                questionPaper: generatedPaper,
                totalMarks: calculateTotalMarks(generatedPaper),
                createdBy,
                updatedBy
            };

            const result = await questionPaperRepository.addQuestionPaper(questionPaperData);
            generatedPapers.push(result);
        }

        return generatedPapers;

    } catch (error) {
        console.error("Error in generateQuestionPaper service:", error);
        throw error;
    }
}

export async function approveQuestionPaper(id, updatedBy) {
    const questionPaperRecord = await questionPaperRepository.getSingleQuestionPaper(id);
    if (!questionPaperRecord) {
        throw new Error(`Question paper with id ${id} not found`);
    }

    // 1. Fetch subject and university ID from exam schedule
    const examSchedule = await questionPaperRepository.getExamScheduleById(questionPaperRecord.examScheduleId);
    if (!examSchedule) {
        throw new Error(`Exam schedule not found for question paper ${id}`);
    }

    const { subjectId } = examSchedule;
    const subject = await subjectRepository.getSubjectById(subjectId);
    if (!subject) {
        throw new Error(`Subject with id ${subjectId} not found`);
    }

    // 2. Iterate through sections and questions to add/update in bank
    const sections = questionPaperRecord.questionPaper;
    if (sections && Array.isArray(sections)) {
        for (const section of sections) {
            if (section.questions && Array.isArray(section.questions)) {
                for (const question of section.questions) {
                    if (question.id) {
                        // Update status for existing bank questions
                        await questionBankRepository.updateQuestion(question.id, { status: questionStatus[1], updatedBy });
                    } else {
                        // Create new entries for questions not in bank
                        const questionData = {
                            type: section.typeOfQuestions || question.type,
                            difficulty: question.difficulty,
                            bloom: question.bloom,
                            marks: question.marks,
                            question: question.question,
                            Answer: question.Answer,
                            content: question.content,
                            subjectId,
                            status: questionStatus[1],
                            createdBy: updatedBy,
                            updatedBy
                        };
                        await questionBankRepository.addQuestion(questionData);
                    }
                }
            }
        }
    }

    // 3. Update the question paper status itself
    return await questionPaperRepository.updateQuestionPaper(id, { status: questionStatus[1], updatedBy });
}
