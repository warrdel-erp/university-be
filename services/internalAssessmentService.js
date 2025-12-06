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
};

// export async function evaluationInternalAssessment(subjectId, employeeId) {
//   const data = await InternalAssessmentRepository.evaluationInternalAssessment(subjectId, employeeId);
//   if (!data) return null;

//   const ia = data.dataValues ?? data;

//   // first syllabus marks (always first element)
//   const syllabusList = ia.assessmentExamType?.syllabusDetailsExam ?? [];
//   const firstSyllabus = syllabusList.length ? syllabusList[0] : null;
//   const syllabusMarks = firstSyllabus?.marks ? Number(firstSyllabus.marks) : 0;

//   const weightage = ia.weightage ? Number(ia.weightage) : 0;
//   const totalMarks = ia.totalMarks ? Number(ia.totalMarks) : 0;

//   const division = Number(((weightage * syllabusMarks) / 100).toFixed(2));

//   const semesterStudents = ia.assessmentSemester?.studentSemester ?? [];

//   const students = semesterStudents.map(student => {
//     const results = Array.isArray(student.studentresult) ? student.studentresult : [];

//     let sr = results.find(r => {
//       const rId = Number(r.examAssessmentId ?? r.exam_assessment_id ?? 0);
//       return rId === Number(ia.examAssessmentId ?? ia.exam_assessment_id ?? 0);
//     });

//     if (!sr && results.length > 0) sr = results[0];

//     const studentMarks = sr && (sr.marks !== undefined && sr.marks !== null) ? Number(sr.marks) : '--';

//     const conversion = (totalMarks > 0)
//       ? Number(((division * studentMarks) / totalMarks).toFixed(2))
//       : '--';

//     return {
//       studentId: student.studentId,
//       scholarNumber: student.scholarNumber,
//       name: `${student.firstName ?? ""} ${student.middleName ?? ""} ${student.lastName ?? ""}`.replace(/\s+/g, " ").trim(),
//       marks: studentMarks,
//       conversion,
//       status: sr?.status ?? "pending",
//       comments: sr?.comments ?? '--',
//       file: sr?.file ?? '--'
//     };
//   });

//   return {
//     internalAssessmentId: ia.examAssessmentId,
//     subjectId: ia.subjectId,
//     subjectName: ia.assessmentSubject?.subjectName ?? ia.assessmentSubject?.subject_name ?? null,
//     employeeId: ia.employeeId ?? employeeId,
//     semesterId: ia.semesterId,
//     weightage,
//     syllabusMarks,
//     totalMarks,
//     division,
//     students
//   };
// };

export async function evaluationInternalAssessment(subjectId, employeeId) {

  const data = await InternalAssessmentRepository.evaluationInternalAssessment(
    subjectId,
    employeeId
  );  

  if (!data) return null;

  const ia = data?.dataValues ?? data;

  // const totalMarks = ia.totalMarks ?? 0;

  const syllabusList = ia.assessmentExamType?.syllabusDetailsExam ?? [];
  const firstSyllabus = syllabusList.length ? syllabusList[0] : null;
  const syllabusMarks = firstSyllabus?.marks ? Number(firstSyllabus.marks) : 0;

  const weightage = ia.weightage ? Number(ia.weightage) : 0;
  const totalMarks = ia.totalMarks ? Number(ia.totalMarks) : 0;

  const division = Number(((weightage * syllabusMarks) / 100).toFixed(2));

  const semesterStudents = ia.assessmentSemester?.studentSemester ?? [];

  const students = semesterStudents.map(student => {
    const results = Array.isArray(student.studentresult) ? student.studentresult : [];

    let sr = results.find(r => {
      const rId = Number(r.examAssessmentId ?? r.exam_assessment_id ?? 0);
      return rId === Number(ia.examAssessmentId ?? ia.exam_assessment_id ?? 0);
    });

    if (!sr && results.length > 0) sr = results[0];

    const studentMarks = sr && (sr.marks !== undefined && sr.marks !== null) ? Number(sr.marks) : '--';

    const conversion = (totalMarks > 0)
      ? Number(((division * studentMarks) / totalMarks).toFixed(2))
      : '--';

    return {
      studentId: student.studentId,
      scholarNumber: student.scholarNumber,
      name: `${student.firstName ?? ""} ${student.middleName ?? ""} ${student.lastName ?? ""}`.replace(/\s+/g, " ").trim(),
      marks: studentMarks,
      conversion,
      status: sr?.status ?? "pending",
      comments: sr?.comments ?? '--',
      file: sr?.file ?? '--'
    };
  });

  /** ================= Final formatted output ================= */
  return {
    assessment: {
     assessmentType: ia.type ?? null,

      subject: ia.assessmentSubject?.subjectName ?? null,
      term: ia.assessmentSemester?.termName ?? null,
      marks: totalMarks,
      attachedFile: ia.file ?? null,
      description: ia.description ?? null,

      homeworkDate: ia.publishDate ?? null,
      submissionDate: ia.dueDate ?? null,
      evaluationDate: ia.dueDate ?? null,

      createdBy: ia.employees?.employeeName ?? null,
      evaluatedBy: ia.employees?.employeeName ?? null
    },

    students
  };
}


export async function createAssessmentEvaluation(body,createdBy,updatedBy) {
  try {
    const {
      subjectId,
      employeeId,
      examAssessmentId,
      students
    } = body;

    const dataToInsert = students.map(student => ({
      subjectId: Number(subjectId),
      employeeId: Number(employeeId),
      examAssessmentId: Number(examAssessmentId),
      studentId: Number(student.studentId),
      status: student.status || "pending",
      marks: Number(student.marks),
      comments: student.comments || "",
      file: student.file || null,
      createdBy: Number(createdBy),
      updatedBy: Number(updatedBy)
    }));

    return await InternalAssessmentRepository.bulkInsertEvaluation(dataToInsert);

  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
};

export async function updateAssessmentEvaluation(data) {
  const {assessmentEvalutionId} = data;
  return await InternalAssessmentRepository.updateEvaluation(assessmentEvalutionId, data);
}