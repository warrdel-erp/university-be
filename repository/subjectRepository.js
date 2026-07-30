import * as model from "../models/index.js";

import sequelize from "../database/sequelizeConfig.js";

import { Op } from "sequelize";

import { buildScope, scoped } from "../utility/scoped.js";

async function getContactHoursSumBySubjectIds(subjectIds) {
  if (!subjectIds.length) {
    return {};
  }

  const units = await scoped(model.syllabusUnitModel).findAll({
    where: {
      subjectId: { [Op.in]: subjectIds },
    },

    attributes: ["subjectId", "contactHours"],

    raw: true,
  });

  return units.reduce((sums, unit) => {
    const hours = parseFloat(unit.contactHours) || 0;

    sums[unit.subjectId] = (sums[unit.subjectId] || 0) + hours;

    return sums;
  }, {});
}

export async function getAllSubjects(filter = {}) {
  try {
    const {
      universityId: _u,
      instituteId: _i,
      academicYearId: _y,
      ...subjectFilter
    } = filter;

    const result = await scoped(model.subjectModel).findAll({
      where: subjectFilter,

      order: [["subjectName", "ASC"]],

      include: [
        {
          model: model.courseModel,

          as: "courseInfo",

          attributes: ["courseId", "courseName"],
        },
      ],
    });

    if (!result.length) {
      return result;
    }

    const subjectIds = result.map((subject) => subject.subjectId);

    const contactHoursBySubject =
      await getContactHoursSumBySubjectIds(subjectIds);

    return result.map((subject) => {
      const plain = subject.toJSON();

      const totalContactHours = contactHoursBySubject[plain.subjectId] || 0;

      return {
        ...plain,

        contactHours: String(totalContactHours),
      };
    });
  } catch (error) {
    console.error("Error in getAllSubjects repository:", error);

    throw error;
  }
}

export async function setSubjectTerms(termsArray) {
  try {
    const subjectIds = termsArray.map((item) => item.subjectId);

    const existingTerms = await scoped(model.subjectModel).findAll({
      where: {
        subjectId: subjectIds,

        term: { [Op.ne]: null },
      },

      attributes: ["subjectId", "subjectCode"],
    });

    if (existingTerms.length > 0) {
      const subjectCodes = existingTerms.map((s) => s.subjectCode).join(", ");

      const error = new Error(
        `Cannot update terms. The following subjects already have term values: ${subjectCodes}`,
      );

      error.statusCode = 400;

      throw error;
    }

    const t = await sequelize.transaction();

    try {
      for (const item of termsArray) {
        const line = await scoped(model.subjectModel).findOne({
          where: { subjectId: item.subjectId },

          attributes: ["subjectId"],

          transaction: t,
        });

        if (!line) {
          continue;
        }

        await scoped(model.subjectModel).update(
          { term: item.term },

          {
            where: { subjectId: item.subjectId },

            transaction: t,
          },
        );
      }

      await t.commit();

      return true;
    } catch (error) {
      await t.rollback();

      throw error;
    }
  } catch (error) {
    console.error("Error in setSubjectTerms repository:", error);

    throw error;
  }
}

export async function getSubjectById(id) {
  try {
    return await scoped(model.subjectModel).findByPk(id);
  } catch (error) {
    console.error("Error fetching subject by ID:", error);

    throw error;
  }
}

export async function deleteSubject(subjectId) {
  try {
    const mappingsCount = await scoped(model.teacherSubjectMappingModel).count({
      where: { subjectId: Number(subjectId) }
    });

    if (mappingsCount > 0) {
      const error = new Error('Cannot delete subject. It is currently assigned to a teacher.');
      error.statusCode = 400;
      throw error;
    }

    return await scoped(model.subjectModel).destroy({
      where: { subjectId: Number(subjectId) }
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
}
