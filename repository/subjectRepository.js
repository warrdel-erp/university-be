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

function formatSubjectWithComponents(subjectPlain, contactHours = "0") {
  const scmMappings = Array.isArray(subjectPlain.subjectComponentMappings)
    ? subjectPlain.subjectComponentMappings
    : [];

  const components = scmMappings.map((scm) => {
    const comp = scm.component || {};
    const componentId = comp.id ?? scm.subjectComponentId ?? null;
    return {
      id: componentId,
      componentId,
      subjectComponentMappingId: scm.id ?? null,
      subject_component_mapping_id: scm.id ?? null,
      componentName: comp.componentName ?? null,
      code: comp.code ?? null,
      description: comp.description ?? null,
      createdAt: comp.createdAt ?? scm.createdAt ?? null,
      updatedAt: comp.updatedAt ?? scm.updatedAt ?? null,
    };
  });

  const componentIds = components.map((c) => c.id).filter(Boolean);

  return {
    ...subjectPlain,
    contactHours: String(contactHours),
    components,
    component: components[0] || null,
    componentIds,
    subjectComponentMappingId: components[0]?.subjectComponentMappingId || null,
    subjectComponentMappings: scmMappings,
    subject_component_mappings: scmMappings,
  };
}

export async function getAllSubjects(filter = {}) {
  try {
    const {
      universityId: _u,
      instituteId: _i,
      academicYearId: _y,
      componentId,
      ...subjectFilter
    } = filter;

    const mappingInclude = {
      model: model.subjectComponentMappingModel,
      as: "subjectComponentMappings",
      attributes: ["id", "subjectId", "subjectComponentId", "createdAt", "updatedAt"],
      required: Boolean(componentId),
      ...(componentId && { where: { subjectComponentId: Number(componentId) } }),
      include: [
        {
          model: model.subjectComponentModel,
          as: "component",
          attributes: ["id", "componentName", "code", "description", "createdAt", "updatedAt"],
          required: false,
        },
      ],
    };

    const result = await scoped(model.subjectModel).findAll({
      where: subjectFilter,

      order: [["subjectName", "ASC"]],

      include: [
        {
          model: model.courseModel,

          as: "courseInfo",

          attributes: ["courseId", "courseName"],
        },
        mappingInclude,
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

      return formatSubjectWithComponents(plain, totalContactHours);
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
    const subject = await scoped(model.subjectModel).findByPk(id, {
      include: [
        {
          model: model.courseModel,
          as: "courseInfo",
          attributes: ["courseId", "courseName"],
        },
        {
          model: model.subjectComponentMappingModel,
          as: "subjectComponentMappings",
          attributes: ["id", "subjectId", "subjectComponentId", "createdAt", "updatedAt"],
          required: false,
          include: [
            {
              model: model.subjectComponentModel,
              as: "component",
              attributes: ["id", "componentName", "code", "description", "createdAt", "updatedAt"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!subject) return null;

    const plain = subject.toJSON ? subject.toJSON() : subject;
    const contactHoursBySubject = await getContactHoursSumBySubjectIds([plain.subjectId]);
    const totalContactHours = contactHoursBySubject[plain.subjectId] || 0;

    return formatSubjectWithComponents(plain, totalContactHours);
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
