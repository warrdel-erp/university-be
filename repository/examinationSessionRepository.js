import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

export async function createExaminationSession(sessionData, options = {}) {
  const { classSectionTerms, ...mainData } = sessionData;
  const record = await scoped(model.examinationSessionModel).create(mainData, options);

  if (Array.isArray(classSectionTerms) && classSectionTerms.length > 0) {
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

  return {
    totalRecords: count,
    totalPages: Math.ceil(count / limitNum),
    currentPage: pageNum,
    pageSize: limitNum,
    data: rows,
  };
}

export async function getExaminationSessionById(id, options = {}) {
  const parsedId = Number(id);
  if (isNaN(parsedId)) return null;

  return await scoped(model.examinationSessionModel).findOne({
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
}

export async function updateExaminationSession(id, updateData = {}, options = {}) {
  const sessionId = Number(id);
  const { classSectionTerms, ...mainUpdateData } = updateData;

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
