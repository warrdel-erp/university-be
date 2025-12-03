import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";
import { uploadFile } from "../utility/awsServices.js";

export async function addInternalAssessment(data,files) {
    if(files){
                const uploadPromises = Object.keys(files).map(async key => {
                    const file = files[key];
                    const s3Response = await uploadFile(file);
                    const url = s3Response.Location;
                    data.file = url
                });
              
                  await Promise.all(uploadPromises);
            }
    return await InternalAssessmentRepository.addInternalAssessment(data);
}

export async function getAllInternalAssessment(examSetupTypeId) {
    const assessments = await InternalAssessmentRepository.getAllInternalAssessment(examSetupTypeId);
    console.log(`>>>>>assessments`,JSON.stringify(assessments));
    

    return assessments.map(item => {

        const ia = item.dataValues ? item.dataValues : item;

        const examType = ia.assessmentExamType || {};
        const syllabusList = Array.isArray(examType.syllabusDetailsExam)
            ? examType.syllabusDetailsExam
            : [];

        // Always take FIRST entry of array
        const firstSyllabus = syllabusList.length > 0 ? syllabusList[0] : null;

        const marks = firstSyllabus && firstSyllabus.marks 
            ? Number(firstSyllabus.marks) 
            : 0;

        const weightage = ia.weightage ? Number(ia.weightage) : 0;

        const division = Number(((weightage * marks) / 100).toFixed(2));

        return {
            examAssessmentId: ia.examAssessmentId,
            subjectId: ia.subjectId,
            semesterId: ia.semesterId,
            examSetupTypeId: ia.examSetupTypeId,
            type: ia.type,

            totalMarks: ia.totalMarks,
            weightage: ia.weightage,
            division,  

            publishDate: ia.publishDate,
            dueDate: ia.dueDate,
            description: ia.description,
            file: ia.file || null,
        };
    });
}


export async function getInternalAssessmentById(examAssessmentId) {
    const data = await InternalAssessmentRepository.getInternalAssessmentById(examAssessmentId);    

    if (!data) return null;

    const ia = data.dataValues;

    const subject = ia.assessmentSubject || {};
    const semester = ia.assessmentSemester || {};
    const examType = ia.assessmentExamType || {};

    const syllabusList = Array.isArray(examType.syllabusDetailsExam)
        ? examType.syllabusDetailsExam
        : [];

    const firstSyllabus = syllabusList.length > 0 ? syllabusList[0] : null;

    const marks = firstSyllabus && firstSyllabus.marks
        ? Number(firstSyllabus.marks)
        : 0;

    const weightage = ia.weightage ? Number(ia.weightage) : 0;

    const division = Number(((weightage * marks) / 100).toFixed(2));

    // FINAL UI RESPONSE
    return {
        examAssessmentId: ia.examAssessmentId,

        subject: {
            subjectId: ia.subjectId,
            name: subject.subjectName  || null,
            code: subject.subjectCode  || null
        },

        semester: {
            semesterId: ia.semesterId,
            name: semester.name  || null
        },

        examSetupType: {
            examSetupTypeId: ia.examSetupTypeId,
            examType: examType.examType,
            examName: examType.examName,
        },

        totalMarks: ia.totalMarks,
        weightage: ia.weightage,

        division,

        publishDate: ia.publishDate,
        dueDate: ia.dueDate,
        description: ia.description,
        file: ia.file,

        syllabus: syllabusList,           
        firstSyllabus: firstSyllabus,     
        examStructure: examType.examStructure || null,
    };
}


export async function updateInternalAssessment(dataArray) {
    console.log(">>>>>>>updateInternalAssessment", dataArray);

    try {
        const results = [];

        for (const item of dataArray) {
            const { examAssessmentId, ...updateData } = item;

            if (!examAssessmentId) {
                results.push({ error: "examAssessmentId missing", item });
                continue;
            }

            const result = await InternalAssessmentRepository.updateInternalAssessment(
                examAssessmentId,
                updateData
            );

            results.push({
                examAssessmentId,
                updated: result[0] === 1 ? true : false
            });
        }

        return results;

    } catch (error) {
        console.error("Error in updateInternalAssessment service:", error);
        throw error;
    }
};

export async function deleteInternalAssessment(id) {
    return await InternalAssessmentRepository.deleteInternalAssessment(id);
}