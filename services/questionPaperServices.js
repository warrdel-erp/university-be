import * as questionPaperRepository from "../repository/questionPaperRepository.js";
import * as questionPaperBlueprintRepository from "../repository/questionPaperBlueprintRepository.js";
import * as questionBankRepository from "../repository/questionBankRepository.js";

export async function addQuestionPaper(questionPaperData, createdBy, updatedBy, universityId) {
    const { examScheduleId } = questionPaperData;

    // 1. Check if examSchedule exists
    const examSchedule = await questionPaperRepository.getExamScheduleById(examScheduleId);
    if (!examSchedule) {
        throw new Error(`Exam schedule with id ${examScheduleId} not found`);
    }

    questionPaperData.createdBy = createdBy;
    questionPaperData.updatedBy = updatedBy;
    const result = await questionPaperRepository.addQuestionPaper(questionPaperData);
    return result;
}

export async function getQuestionPapers(filters, pagination) {
    return await questionPaperRepository.getQuestionPapers(filters, pagination);
}

export async function getSingleQuestionPaper(id) {
    return await questionPaperRepository.getSingleQuestionPaper(id);
}

export async function updateQuestionPaper(id, questionPaperData, updatedBy) {
    questionPaperData.updatedBy = updatedBy;
    return await questionPaperRepository.updateQuestionPaper(id, questionPaperData);
}

export async function deleteQuestionPaper(id) {
    return await questionPaperRepository.deleteQuestionPaper(id);
}

export async function generateQuestionPaper(name, blueprintId, examScheduleId, numberOfPapers, createdBy, updatedBy, universityId) {
    try {
        // 1. Fetch blueprint
        const blueprintRecord = await questionPaperBlueprintRepository.getBlueprintById(blueprintId, universityId);
        if (!blueprintRecord) {
            throw new Error(`Blueprint with id ${blueprintId} not found`);
        }
        const blueprintSections = blueprintRecord.blueprint;

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
                    universityId,
                    blueprintRecord.subjectId,
                    typeOfQuestions,
                    marksPerQuestion,
                    totalQuestions
                );

                if (questions.length < totalQuestions) {
                    throw new Error(`Not enough approved questions found for section ${sectionName}. Expected ${totalQuestions}, got ${questions.length}`);
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
