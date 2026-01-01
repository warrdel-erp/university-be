import sequelize from "../database/sequelizeConfig.js";
import * as gradeRepo from "../repository/gradeRepository.js";

/* =========================
   CREATE GRADE SCHEME
========================= */

export async function addGradeScheme(data) {
  const transaction = await sequelize.transaction();

  try {
    if (!data.schemeName) {
      throw new Error("schemeName is required");
    }

    /* 1️⃣ CREATE GRADE */
    const grade = await gradeRepo.addGrade(
      {
        universityId: data.universityId,
        instituteId: data.instituteId,
        schemeName: data.schemeName,
        regulationCode: data.regulationCode,
        gradingType: data.gradingType,
        marksSystem: data.marksSystem,
        saveType: data.saveType,
        gpsFormula: data.gpsFormula,
        decimalPrecision: data.decimalPrecision,
        roundingRule: data.roundingRule,
        includeFailedSubjectsInGpa: data.includeFailedSubjectsInGpa,
        includeSemester: data.includeSemester,
        gradeReplacementRule: data.gradeReplacementRule,
        maxAttemptsAllowed: data.maxAttemptsAllowed,
        improvementAllowed: data.improvementAllowed,
        carryInternalMarksInBacklogs: data.carryInternalMarksInBacklogs,
        gradeMarksEnabled: data.gradeMarksEnabled,
        maxGracePerSubjects: data.maxGracePerSubjects,
        maxGracePerSemester: data.maxGracePerSemester,
        applyGrace: data.applyGrace,
        moderationType: data.moderationType,
        moderationValue: data.moderationValue,
        minimumAttendance: data.minimumAttendance,
        condonationAllowed: data.condonationAllowed,
        condonationLimit: data.condonationLimit,
        ifAttendanceMinimum: data.ifAttendanceMinimum,
        resultStatus: data.resultStatus,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy
      },
      transaction
    );

    const gradeId = grade.dataValues.gradeId;

    /* 2️⃣ GRADE SCALES */
    if (data.scales?.length) {
      await gradeRepo.addGradeScales(
        data.scales.map(s => ({
          ...s,
          gradeId,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy
        })),
        transaction
      );
    }

    /* 3️⃣ COURSE + PASS FAIL */
    if (data.course?.length) {
      for (const course of data.course) {

        const gradeCourse = await gradeRepo.addGradeCourse(
          {
            gradeId,
            acedmicYearId: course.academicYearId,
            courseId: course.courseId,
            sessionId: course.sessionId,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy
          },
          transaction
        );

        if (course.passFail?.length) {
          await gradeRepo.addGradePassFail(
            course.passFail.map(pf => ({
              ...pf,
              gradeCourseId: gradeCourse.dataValues.gradeCourseId,
              createdBy: data.createdBy,
              updatedBy: data.updatedBy
            })),
            transaction
          );
        }
      }
    }

    await transaction.commit();
    return grade;

  } catch (error) {
    await transaction.rollback();
    console.error("Service Error - addGradeScheme:", error.message);
    throw new Error(error.message);
  }
}

/* =========================
   READ
========================= */

export async function getAllGradeSchemes(universityId, instituteId, role) {
  try {
    return await gradeRepo.getAllGrades(universityId, instituteId, role);
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getSingleGradeScheme(gradeId) {
  try {
    if (!gradeId) throw new Error("gradeId is required");
    return await gradeRepo.getSingleGrade(gradeId);
  } catch (error) {
    throw new Error(error.message);
  }
}

/* =========================
   UPDATE (DRAFT)
========================= */
export async function updateGradeScheme(gradeId, data) {
  const transaction = await sequelize.transaction();

  try {
    if (!gradeId) throw new Error("gradeId is required");

    /* =========================
       1️⃣ UPDATE GRADE (MAIN)
    ========================= */
    await gradeRepo.updateGrade(
      gradeId,
      {
        schemeName: data.schemeName,
        regulationCode: data.regulationCode,
        gradingType: data.gradingType,
        marksSystem: data.marksSystem,
        saveType: data.saveType,

        gpsFormula: data.gpsFormula,
        decimalPrecision: data.decimalPrecision,
        roundingRule: data.roundingRule,
        includeFailedSubjectsInGpa: data.includeFailedSubjectsInGpa,
        includeSemester: data.includeSemester,

        gradeReplacementRule: data.gradeReplacementRule,
        maxAttemptsAllowed: data.maxAttemptsAllowed,
        improvementAllowed: data.improvementAllowed,
        carryInternalMarksInBacklogs: data.carryInternalMarksInBacklogs,

        gradeMarksEnabled: data.gradeMarksEnabled,
        maxGracePerSubjects: data.maxGracePerSubjects,
        maxGracePerSemester: data.maxGracePerSemester,
        applyGrace: data.applyGrace,
        moderationType: data.moderationType,
        moderationValue: data.moderationValue,

        minimumAttendance: data.minimumAttendance,
        condonationAllowed: data.condonationAllowed,
        condonationLimit: data.condonationLimit,
        ifAttendanceMinimum: data.ifAttendanceMinimum,
        resultStatus: data.resultStatus,

        createdBy: data.createdBy,
        updatedBy: data.updatedBy

      },
      transaction
    );

    /* =========================
       2️⃣ UPDATE GRADE SCALE
    ========================= */
    if (Array.isArray(data.scales)) {
      // Remove old scales
      await gradeRepo.deleteGradeScalesByGradeId(gradeId, transaction);

      // Insert new scales
      if (data.scales.length > 0) {
        await gradeRepo.addGradeScales(
          data.scales.map(scale => ({
            ...scale,
            gradeId,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy

          })),
          transaction
        );
      }
    }

    /* =========================
       3️⃣ UPDATE GRADE COURSE + PASS FAIL
    ========================= */
    if (Array.isArray(data.course)) {

      // 🔴 HARD RESET STRATEGY (SAFE & SIMPLE)
      // Delete old courses (cascade deletes passFail)
      await gradeRepo.deleteGradeCoursesByGradeId(gradeId, transaction);

      for (const course of data.course) {

        const gradeCourse = await gradeRepo.addGradeCourse(
          {
            gradeId,
            acedmicYearId: course.academicYearId,
            courseId: course.courseId,
            sessionId: course.sessionId,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy

          },
          transaction
        );

        // Insert pass/fail rules
        if (Array.isArray(course.passFail) && course.passFail.length > 0) {
          await gradeRepo.addGradePassFail(
            course.passFail.map(pf => ({
              ...pf,
              gradeCourseId: gradeCourse.gradeCourseId,
              createdBy: data.createdBy,
              updatedBy: data.updatedBy

            })),
            transaction
          );
        }
      }
    }

    await transaction.commit();
    return true;

  } catch (error) {
    await transaction.rollback();
    console.error("Service Error - updateGradeScheme:", error.message);
    throw new Error(error.message);
  }
}


/* =========================
   DELETE
========================= */

export async function deleteGradeScheme(gradeId) {
  try {
    if (!gradeId) throw new Error("gradeId is required");
    return await gradeRepo.deleteGrade(gradeId);
  } catch (error) {
    throw new Error(error.message);
  }
}