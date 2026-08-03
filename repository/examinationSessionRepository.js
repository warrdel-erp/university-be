import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createExaminationSession(sessionData, options = {}) {
  const { classSectionTerms, ...mainData } = sessionData;

  if (mainData.assessmentTypeId) {
    const existing = await scoped(model.examinationSessionModel).findOne({
      where: { assessmentTypeId: Number(mainData.assessmentTypeId) },
      transaction: options.transaction,
    });

    if (existing) {
      const error = new Error("An examination session for this assessment type already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  const record = await scoped(model.examinationSessionModel).create(mainData, options);

  if (Array.isArray(classSectionTerms) && classSectionTerms.length > 0) {
    const termIds = classSectionTerms.map((t) => Number(t.classSectionTermId)).filter(Boolean);
    if (termIds.length > 0) {
      const validTerms = await model.classSectionTermModel.findAll({
        where: { classSectionTermId: { [Op.in]: termIds } },
        attributes: ["classSectionTermId"],
        raw: true,
        transaction: options.transaction,
      });
      const validTermSet = new Set(validTerms.map((vt) => vt.classSectionTermId));
      const invalidTerm = termIds.find((id) => !validTermSet.has(id));
      if (invalidTerm !== undefined) {
        const error = new Error(`Class section term ID ${invalidTerm} does not exist.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const termsToCreate = classSectionTerms.map((term) => ({
      ...term,
      examinationSessionId: record.examinationSessionId,
    }));

    await Promise.all(
      termsToCreate.map((t) =>
        model.examinationSessionTermModel.create(t, { transaction: options.transaction })
      )
    );
  }

  return await getExaminationSessionById(record.examinationSessionId, options);
}

export async function getExaminationSessions({
  search,
  status,
  academicYearId,
  assessmentTypeId,
  universityId,
  instituteId,
  page = 1,
  limit = 10,
}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (status) where.status = status;
  if (academicYearId) where.academicYearId = Number(academicYearId);
  if (assessmentTypeId) where.assessmentTypeId = Number(assessmentTypeId);
  if (universityId) where.universityId = Number(universityId);
  if (instituteId) where.instituteId = Number(instituteId);

  if (search) {
    where.sessionName = { [Op.like]: `%${search}%` };
  }

  const { count, rows } = await scoped(model.examinationSessionModel).findAndCountAll({
    where,
    include: [
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.examSetupTypeModel,
        as: "assessmentType",
        attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        required: false,
      },
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        include: [
          {
            model: model.classSectionTermModel,
            as: "classSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId", "term"],
            required: false,
          },
        ],
        required: false,
      },
    ],
    distinct: true,
    order: [["examinationSessionId", "DESC"]],
    limit: limitNum,
    offset,
  });

  const formattedRows = await Promise.all(
    rows.map(async (row) => {
      const sessionPlain = row.get({ plain: true });

      // 1. Calculate courseCount, totalStudents, and subjectCount from mapped classSectionTerms
      let courseCount = 0;
      let totalStudents = 0;
      const termsList = sessionPlain.examinationSessionTerms || [];
      const cstIds = [...new Set(termsList.map((t) => t.classSectionTermId).filter(Boolean))];

      if (cstIds.length > 0) {
        const cstRecords = await model.classSectionTermModel.findAll({
          where: { classSectionTermId: { [Op.in]: cstIds } },
          attributes: ["classSectionsId", "term"],
          raw: true,
        });

        const csIds = [...new Set(cstRecords.map((cst) => cst.classSectionsId).filter(Boolean))];
        let courseIds = [];
        if (csIds.length > 0) {
          const csRecords = await model.classSectionModel.findAll({
            where: { classSectionsId: { [Op.in]: csIds } },
            attributes: ["courseId"],
            raw: true,
          });

          courseIds = [...new Set(csRecords.map((cs) => cs.courseId).filter(Boolean))];
          courseCount = courseIds.length;
        }

        const studentWhere = [];
        if (cstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: cstIds } });
        if (csIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: csIds } });

        totalStudents = await model.studentClassSectionsHistoryModel.count({
          where: { [Op.or]: studentWhere },
        });
      }

      return {
        ...sessionPlain,
        courseCount,
        totalStudents,
      };
    })
  );

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: formattedRows,
  };
}

export async function getExaminationSessionById(id, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;

  const sessionRecord = await scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: parsedId },
    include: [
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["academicYearId", "yearTitle", "startingDate", "endingDate"],
        required: false,
      },
      {
        model: model.examSetupTypeModel,
        as: "assessmentType",
        attributes: ["examSetupTypeId", "examName", "examCode", "examCategory"],
        required: false,
      },
      {
        model: model.examinationSessionTermModel,
        as: "examinationSessionTerms",
        include: [
          {
            model: model.classSectionTermModel,
            as: "classSectionTerm",
            attributes: ["classSectionTermId", "classSectionsId", "term"],
            required: false,
          },
        ],
        required: false,
      },
    ],
    transaction: options.transaction,
  });

  if (!sessionRecord) return null;

  const sessionPlain = sessionRecord.get({ plain: true });

  // 1. Calculate courseCount, totalStudents, and subjectCount from mapped classSectionTerms
  let courseCount = 0;
  let totalStudents = 0;
  const termsList = sessionPlain.examinationSessionTerms || [];
  const cstIds = [...new Set(termsList.map((t) => t.classSectionTermId).filter(Boolean))];

  if (cstIds.length > 0) {
    const cstRecords = await model.classSectionTermModel.findAll({
      where: { classSectionTermId: { [Op.in]: cstIds } },
      attributes: ["classSectionsId", "term"],
      raw: true,
      transaction: options.transaction,
    });

    const csIds = [...new Set(cstRecords.map((cst) => cst.classSectionsId).filter(Boolean))];
    let courseIds = [];
    if (csIds.length > 0) {
      const csRecords = await model.classSectionModel.findAll({
        where: { classSectionsId: { [Op.in]: csIds } },
        attributes: ["courseId"],
        raw: true,
        transaction: options.transaction,
      });

      courseIds = [...new Set(csRecords.map((cs) => cs.courseId).filter(Boolean))];
      courseCount = courseIds.length;
    }

    const studentWhere = [];
    if (cstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: cstIds } });
    if (csIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: csIds } });

    totalStudents = await model.studentClassSectionsHistoryModel.count({
      where: { [Op.or]: studentWhere },
      transaction: options.transaction,
    });

  }

  return {
    ...sessionPlain,
    courseCount,
    totalStudents,
  };
}

export async function updateExaminationSession(id, updateData = {}, options = {}) {
  const sessionId = Number(id);
  const { classSectionTerms, ...mainUpdateData } = updateData;

  if (mainUpdateData.assessmentTypeId) {
    const existing = await scoped(model.examinationSessionModel).findOne({
      where: {
        assessmentTypeId: Number(mainUpdateData.assessmentTypeId),
        examinationSessionId: { [Op.ne]: sessionId },
      },
      transaction: options.transaction,
    });

    if (existing) {
      const error = new Error("An examination session for this assessment type already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (Object.keys(mainUpdateData).length > 0) {
    await scoped(model.examinationSessionModel).update(mainUpdateData, {
      where: { examinationSessionId: sessionId },
      transaction: options.transaction,
    });
  }

  if (Array.isArray(classSectionTerms)) {
    await model.examinationSessionTermModel.destroy({
      where: { examinationSessionId: sessionId },
      transaction: options.transaction,
    });

    if (classSectionTerms.length > 0) {
      const termsToCreate = classSectionTerms.map((t) => ({
        ...t,
        examinationSessionId: sessionId,
      }));

      await model.examinationSessionTermModel.bulkCreate(termsToCreate, {
        transaction: options.transaction,
      });
    }
  }

  return await getExaminationSessionById(sessionId, options);
}

export async function deleteExaminationSession(id, options = {}) {
  const sessionId = Number(id);
  const existing = await scoped(model.examinationSessionModel).findOne({
    where: { examinationSessionId: sessionId },
    transaction: options.transaction,
  });

  if (!existing) return null;

  await scoped(model.examinationSessionModel).destroy({
    where: { examinationSessionId: sessionId },
    transaction: options.transaction,
  });

  return { message: "Examination session deleted successfully" };
}

// examination_session_term specific CRUD operations

export async function createExaminationSessionTerm(termData, options = {}) {
  if (termData.classSectionTermId) {
    const termExists = await model.classSectionTermModel.findByPk(Number(termData.classSectionTermId), {
      transaction: options.transaction,
    });
    if (!termExists) {
      const error = new Error(`Class section term ID ${termData.classSectionTermId} does not exist.`);
      error.statusCode = 400;
      throw error;
    }
  }
  return await model.examinationSessionTermModel.create(termData, options);
}

export async function deleteExaminationSessionTerm(examinationSessionTermId, options = {}) {
  const existing = await model.examinationSessionTermModel.findOne({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });

  if (!existing) return null;

  await model.examinationSessionTermModel.destroy({
    where: { examinationSessionTermId: Number(examinationSessionTermId) },
    transaction: options.transaction,
  });

  return { message: "Examination session term mapping deleted successfully" };
}

export async function getClassSectionTermsBySetupType(examSetupTypeId, options = {}) {
  const setupTypeId = Number(examSetupTypeId);

  // 1. Fetch assessmentPlanIds from assessment_plan_component for examSetupTypeId
  const components = await scoped(model.assessmentPlanComponentModel).findAll({
    where: { examSetupTypeId: setupTypeId },
    attributes: ["assessmentPlanId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!components || components.length === 0) {
    return [];
  }

  const planIds = [...new Set(components.map((c) => c.assessmentPlanId).filter(Boolean))];
  if (planIds.length === 0) {
    return [];
  }

  // 2. Fetch subjectIds from assessment_plan_subject_mapping for these assessmentPlanIds
  const subjectMappings = await scoped(model.assessmentPlanSubjectMappingModel).findAll({
    where: { assessmentPlanId: { [Op.in]: planIds } },
    attributes: ["subjectId", "courseId", "sessionId"],
    raw: true,
    transaction: options.transaction,
  });

  if (!subjectMappings || subjectMappings.length === 0) {
    return [];
  }

  const subjectIds = [...new Set(subjectMappings.map((m) => m.subjectId).filter(Boolean))];
  if (subjectIds.length === 0) {
    return [];
  }

  // 3. Fetch subjects to get courseId and term
  const subjects = await scoped(model.subjectModel).findAll({
    where: { subjectId: { [Op.in]: subjectIds } },
    attributes: ["subjectId", "courseId", "term"],
    raw: true,
    transaction: options.transaction,
  });

  // Map courseId -> Set of terms
  const courseTermsMap = new Map();
  for (const sub of subjects) {
    if (!sub.courseId) continue;
    if (!courseTermsMap.has(sub.courseId)) {
      courseTermsMap.set(sub.courseId, new Set());
    }
    if (sub.term != null) {
      courseTermsMap.get(sub.courseId).add(sub.term);
    }
  }

  const targetCourseIds = [...courseTermsMap.keys()];
  if (targetCourseIds.length === 0) {
    return [];
  }

  // 4. Fetch course details for all target courses
  const courses = await scoped(model.courseModel).findAll({
    where: { courseId: { [Op.in]: targetCourseIds } },
    attributes: ["courseId", "courseName", "courseCode", "courseDuration", "termType", "totalTerms"],
    raw: true,
    transaction: options.transaction,
  });

  const courseMap = new Map(courses.map((c) => [c.courseId, c]));

  // 5. For each course, fetch matching class_section_term entries
  const result = [];

  for (const cId of targetCourseIds) {
    const courseDetails = courseMap.get(cId);
    if (!courseDetails) continue;

    const termsArray = [...(courseTermsMap.get(cId) || [])];

    // Fetch class_sections for this course
    const classSections = await scoped(model.classSectionModel).findAll({
      where: { courseId: cId },
      attributes: ["classSectionsId"],
      raw: true,
      transaction: options.transaction,
    });

    const classSectionsIds = [...new Set(classSections.map((cs) => cs.classSectionsId).filter(Boolean))];

    let termDetails = [];
    if (classSectionsIds.length > 0 && termsArray.length > 0) {
      const rawTermDetails = await scoped(model.classSectionTermModel).findAll({
        where: {
          classSectionsId: { [Op.in]: classSectionsIds },
          term: { [Op.in]: termsArray },
        },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        raw: true,
        transaction: options.transaction,
      });

      // Calculate studentCount and subjectCount per distinct term
      termDetails = await Promise.all(
        termsArray.map(async (t) => {
          const matchingItems = rawTermDetails.filter((item) => item.term === t);
          const firstItem = matchingItems[0] || {};

          const allCstIds = matchingItems.map((i) => i.classSectionTermId).filter(Boolean);
          const allCsIds = matchingItems.map((i) => i.classSectionsId).filter(Boolean);

          const studentWhere = [];
          if (allCstIds.length > 0) studentWhere.push({ classSectionTermId: { [Op.in]: allCstIds } });
          if (allCsIds.length > 0) studentWhere.push({ classSectionsId: { [Op.in]: allCsIds } });

          const [studentCount, subjectCount] = await Promise.all([
            studentWhere.length > 0
              ? model.studentClassSectionsHistoryModel.count({
                  where: { [Op.or]: studentWhere },
                  transaction: options.transaction,
                })
              : 0,
            scoped(model.subjectModel).count({
              where: {
                subjectId: { [Op.in]: subjectIds },
                courseId: cId,
                term: t,
              },
              transaction: options.transaction,
            }),
          ]);

          return {
            ...firstItem,
            term: t,
            studentCount,
            subjectCount,
          };
        })
      );
    }

    result.push({
      course: courseDetails,
      terms: termDetails,
    });
  }

  return result;
}
