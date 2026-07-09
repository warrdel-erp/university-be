import * as InternalAssessmentRepository from "../repository/internalAssessmentRepository.js";
import { uploadFile } from "../utility/awsServices.js";
import { buildTermName } from "../utility/courseTerms.js";

export async function addInternalAssessment(data, files) {
  if (files) {
    const uploadPromises = [];
    for (const key of Object.keys(files)) {
      const file = files[key];
      uploadPromises.push(
        (async () => {
          const s3Response = await uploadFile(file);
          const url = s3Response.Location;
          data.file = url;
        })(),
      );
    }

    await Promise.all(uploadPromises);
  }
  return await InternalAssessmentRepository.addInternalAssessment(data);
}

function formatInternalAssessmentDetail(item) {
  const ia = item.get({ plain: true });

  const subject = ia.assessmentSubject;
  const examType = ia.assessmentExamType;
  const syllabusList = examType.syllabusDetailsExam;

  const firstSyllabus = syllabusList.length > 0 ? syllabusList[0] : null;

  const weightage = ia.weightage ? Number(ia.weightage) : 0;
  const totalMarks = ia.totalMarks ? Number(ia.totalMarks) : 0;

  const division = Number(((weightage * totalMarks) / 100).toFixed(2));

  return {
    examAssessmentId: ia.examAssessmentId,
    subjectId: ia.subjectId,
    employeeId: ia.employeeId,
    type: ia.type,

    subject: {
      subjectId: ia.subjectId,
      name: subject.subjectName,
      code: subject.subjectCode,
    },

    term: ia.term,
    termName:
      ia.term != null
        ? buildTermName(subject.courseInfo.termType, ia.term)
        : null,

    examSetupType: {
      examSetupTypeId: ia.examSetupTypeId,
      examType: examType.examType,
      examName: examType.examName,
    },
    examSetupTypeId: ia.examSetupTypeId,

    totalMarks: ia.totalMarks,
    weightage: ia.weightage,

    division,

    publishDate: ia.publishDate,
    dueDate: ia.dueDate,
    description: ia.description,
    file: ia.file,

    syllabus: syllabusList,
    firstSyllabus,
    examStructure: examType.examStructure || null,
  };
}

function formatInternalAssessmentBasic(item) {
  return item.get ? item.get({ plain: true }) : item;
}

export async function getAllInternalAssessment(examSetupTypeId) {
  const assessments =
    await InternalAssessmentRepository.getAllInternalAssessment(
      examSetupTypeId,
    );

  const formattedAssessments = [];
  for (const item of assessments) {
    formattedAssessments.push(formatInternalAssessmentBasic(item));
  }

  return formattedAssessments;
}

export async function getInternalAssessmentById(examAssessmentId) {
  const data =
    await InternalAssessmentRepository.getInternalAssessmentById(
      examAssessmentId,
    );

  if (!data) return null;

  return formatInternalAssessmentBasic(data);
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

      const result =
        await InternalAssessmentRepository.updateInternalAssessment(
          examAssessmentId,
          updateData,
        );

      results.push({
        examAssessmentId,
        updated: result[0] === 1 ? true : false,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in updateInternalAssessment service:", error);
    throw error;
  }
}

export async function deleteInternalAssessment(id) {
  return await InternalAssessmentRepository.deleteInternalAssessment(id);
}

export async function evaluationInternalAssessment(subjectId, employeeId) {
  const data = await InternalAssessmentRepository.evaluationInternalAssessment(
    subjectId,
    employeeId,
  );

  if (!data) return null;

  const ia = data.get({ plain: true });

  const syllabusList = ia.assessmentExamType.syllabusDetailsExam;
  const firstSyllabus = syllabusList.length ? syllabusList[0] : null;
  const syllabusMarks = firstSyllabus ? Number(firstSyllabus.marks) : 0;

  const weightage = ia.weightage ? Number(ia.weightage) : 0;
  const totalMarks = ia.totalMarks ? Number(ia.totalMarks) : 0;

  const division = Number(((weightage * syllabusMarks) / 100).toFixed(2));

  const termStudents = ia.termStudents;

  const students = [];
  for (const student of termStudents) {
    const results = Array.isArray(student.studentresult)
      ? student.studentresult
      : [];

    let sr = null;
    for (const result of results) {
      const rId = Number(result.examAssessmentId);
      if (rId === Number(ia.examAssessmentId)) {
        sr = result;
        break;
      }
    }

    if (!sr && results.length > 0) sr = results[0];

    const hasStudentMarks = sr && sr.marks !== undefined && sr.marks !== null;
    const studentMarks = hasStudentMarks ? Number(sr.marks) : "--";

    const conversion =
      hasStudentMarks && totalMarks > 0
        ? Number(((division * studentMarks) / totalMarks).toFixed(2))
        : "--";

    students.push({
      studentId: student.studentId,
      scholarNumber: student.scholarNumber,
      name: `${student.firstName || ""} ${student.middleName || ""} ${student.lastName || ""}`
        .replace(/\s+/g, " ")
        .trim(),
      marks: studentMarks,
      conversion,
      status: sr ? sr.status : "pending",
      comments: sr ? sr.comments : "--",
      file: sr ? sr.file : "--",
    });
  }

  /** ================= Final formatted output ================= */
  return {
    assessment: {
      assessmentType: ia.type,

      subject: ia.assessmentSubject.subjectName,
      term:
        ia.term != null
          ? buildTermName(ia.assessmentSubject.courseInfo.termType, ia.term)
          : null,
      marks: totalMarks,
      attachedFile: ia.file,
      description: ia.description,

      homeworkDate: ia.publishDate,
      submissionDate: ia.dueDate,
      evaluationDate: ia.dueDate,

      createdBy: ia.employees.employeeName,
      evaluatedBy: ia.employees.employeeName,
    },

    students,
  };
}

export async function createAssessmentEvaluation(body, createdBy, updatedBy) {
  try {
    const { subjectId, employeeId, examAssessmentId, students } = body;

    const seenStudentIds = new Set();
    const dataToInsert = [];

    for (const student of students) {
      const studentId = Number(student.studentId);
      if (seenStudentIds.has(studentId)) {
        const error = new Error(`Duplicate studentId ${studentId} in request`);
        error.statusCode = 400;
        throw error;
      }

      seenStudentIds.add(studentId);
      dataToInsert.push({
        subjectId: Number(subjectId),
        employeeId: Number(employeeId),
        examAssessmentId: Number(examAssessmentId),
        studentId,
        status: student.status || "pending",
        marks: Number(student.marks),
        comments: student.comments || "",
        file: student.file || null,
        createdBy: Number(createdBy),
        updatedBy: Number(updatedBy),
      });
    }

    return await InternalAssessmentRepository.bulkInsertEvaluation(
      dataToInsert,
    );
  } catch (error) {
    console.error("Service Error:", error);
    throw error;
  }
}

export async function updateAssessmentEvaluation(data) {
  const { assessmentEvalutionId } = data;
  return await InternalAssessmentRepository.updateEvaluation(
    assessmentEvalutionId,
    data,
  );
}
