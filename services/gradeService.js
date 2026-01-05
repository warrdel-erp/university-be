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

    /*  CREATE GRADE */
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

    /*  GRADE SCALES */
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

    /*  COURSE + PASS FAIL */
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
              gradeId,
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
};

/* =========================
   READ
========================= */

export async function getAllGradeSchemes(universityId, instituteId, role) {
  try {
    return await gradeRepo.getAllGrades(universityId, instituteId, role);
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function getSingleGradeScheme(gradeId) {
  try {
    if (!gradeId) throw new Error("gradeId is required");

    const raw = await gradeRepo.getSingleGrade(gradeId);

    if (!raw) return null;

    return {
      gradeId: raw.gradeId,
      universityId: raw.universityId,
      instituteId: raw.instituteId,
      schemeName: raw.schemeName,
      regulationCode: raw.regulationCode,
      gradingType: raw.gradingType,
      marksSystem: raw.marksSystem,
      saveType: raw.saveType,

      gpsFormula: raw.gpsFormula,
      decimalPrecision: Number(raw.decimalPrecision),
      roundingRule: raw.roundingRule,
      includeFailedSubjectsInGpa: raw.includeFailedSubjectsInGpa,
      includeSemester: raw.includeSemester,

      gradeReplacementRule: raw.gradeReplacementRule,
      maxAttemptsAllowed: Number(raw.maxAttemptsAllowed),
      improvementAllowed: raw.improvementAllowed,
      carryInternalMarksInBacklogs: raw.carryInternalMarksInBacklogs,

      gradeMarksEnabled: raw.gradeMarksEnabled,
      maxGracePerSubjects: Number(raw.maxGracePerSubjects),
      maxGracePerSemester: Number(raw.maxGracePerSemester),
      applyGrace: raw.applyGrace,
      moderationType: raw.moderationType,
      moderationValue: raw.moderationValue,

      minimumAttendance: Number(raw.minimumAttendance),
      condonationAllowed: raw.condonationAllowed,
      condonationLimit: raw.condonationLimit,
      ifAttendanceMinimum: raw.ifAttendanceMinimum,
      resultStatus: raw.resultStatus,

      // createdAt: raw.createdAt,
      // updatedAt: raw.updatedAt,
      // createdBy: raw.createdBy,
      // updatedBy: raw.updatedBy,
      // deletedAt: raw.deletedAt,

      /* =======================
         SCALES
      ======================= */
      scales: (raw.scales || []).map(s => ({
        gradeScaleId: s.gradeScaleId,
        gradeId: s.gradeId,
        grade: s.grade,
        minimum: s.minimun,
        maximum: s.maximum,
        gradePoint: s.gradePoint,
        result: s.result,

        // createdAt: s.createdAt,
        // updatedAt: s.updatedAt,
        // createdBy: s.createdBy,
        // updatedBy: s.updatedBy,
        // deletedAt: s.deletedAt
      })),

      /* =======================
         COURSES
      ======================= */
      courses: (raw.coursesGrade || []).map(c => ({
        gradeCourseId: c.gradeCourseId,
        gradeId: c.gradeId,
        academicYearId: c.acedmicYearId,
        courseId: c.courseId,
        sessionId: c.sessionId,

        // createdAt: c.createdAt,
        // updatedAt: c.updatedAt,
        // createdBy: c.createdBy,
        // updatedBy: c.updatedBy,
        // deletedAt: c.deletedAt,

        passFail: (c.passFail || []).map(p => ({
          gradePassFailId: p.gradePassFailId,
          gradeCourseId: p.gradeCourseId,
          examSetupTypeId: p.examSetupTypeId,
          overAllMinimum: p.overAllMinimum,
          theoryMinimum: p.theoryMinimum,
          practicalMinimum: p.practicalMinimum,
          minimumPassingGrade: p.minimumPassingGrade,
          componentWisePass: p.componentWisePass,

          // createdAt: p.createdAt,
          // updatedAt: p.updatedAt,
          // createdBy: p.createdBy,
          // updatedBy: p.updatedBy,
          // deletedAt: p.deletedAt
        })),

        courseDetail: c.Allcourse,
        sessionDetail: c.sessions,
        academicYearDetail: c.academicYear
      }))
    };

  } catch (error) {
    throw new Error(error.message);
  }
}


/* ======================================================
   UPDATE GRADE SCHEME (DRAFT)
====================================================== */
export async function updateGradeScheme(gradeId, data) {
  const transaction = await sequelize.transaction();

  try {
    if (!gradeId) throw new Error("gradeId is required");

    /* ======================================================
        UPDATE GRADE (MAIN TABLE)
    ====================================================== */
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

        updatedBy: data.updatedBy   
      },
      transaction
    );

    /* ======================================================
        UPDATE GRADE SCALES 
    ====================================================== */
    if (Array.isArray(data.scales)) {

      // delete existing scales
      await gradeRepo.deleteGradeScalesByGradeId(gradeId, transaction);

      // recreate scales
      if (data.scales.length > 0) {
        await gradeRepo.addGradeScales(
          data.scales.map(scale => ({
            gradeId,
            grade: scale.grade,
            minimun: scale.minimun,
            maximum: scale.maximum,
            gradePoint: scale.gradePoint,
            result: scale.result,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy
          })),
          transaction
        );
      }
    }

    /* ======================================================
        UPDATE GRADE COURSE + PASS FAIL
    ====================================================== */
    if (Array.isArray(data.course)) {

      // delete old grade courses
      await gradeRepo.deleteGradeCoursesByGradeId(gradeId, transaction);

      for (const course of data.course) {

        /* ===============================
           CREATE GRADE COURSE
        =============================== */
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

        /* ===============================
           PASS / FAIL RESET (BY gradeCourseId)
        =============================== */
        if (Array.isArray(course.passFail)) {

          // delete passFail for THIS gradeCourseId
          await gradeRepo.deleteGradePassFailByGradeCourseId(
            gradeId,
            transaction
          );
          

          //  recreate passFail
          if (course.passFail.length > 0) {
            await gradeRepo.addGradePassFail(
              course.passFail.map(pf => ({
                gradeId,
                gradeCourseId: gradeCourse.gradeCourseId,
                examSetupTypeId: pf.examSetupTypeId,
                overAllMinimum: pf.overAllMinimum,
                theoryMinimum: pf.theoryMinimum,
                practicalMinimum: pf.practicalMinimum,
                minimumPassingGrade: pf.minimumPassingGrade,
                componentWisePass: pf.componentWisePass,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy
              })),
              transaction
            );
          }
        }
      }
    }

    /* ======================================================
       COMMIT
    ====================================================== */
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