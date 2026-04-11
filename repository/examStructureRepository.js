import * as model from "../models/index.js";

export async function addExamStructure(examDetail) {
    try {
        const result = await model.examStructureModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam Structure:", error);
        throw error;
    }
};

export async function getExamStructure(universityId,acedmicYearId,role,instituteId) {
    try {
        const whereClause = {
        ...(universityId && { universityId }),
        ...(acedmicYearId && { acedmicYearId }),
        ...(role === 'Head' && { institute_id: instituteId })
        };
        const result = await model.examStructureModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
            },
            where:whereClause,
            include: [
                {
                    model: model.courseModel,
                    as: "courseExam",
                    exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
                },
                {
                    model: model.sessionModel,
                    as: "sessionExam",
                    exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
                },
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam Structures:", error);
        throw error;
    }
};

export async function getSingleExamStructure(courseId, sessionId, universityId) {
    try {
        const result = await model.examStructureModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { courseId, sessionId, universityId },
            include: [
                {
                    model: model.courseModel,
                    as: "courseExam",
                    exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
                },
                {
                    model: model.sessionModel,
                    as: "sessionExam",
                    exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy",]
                },
            ],
        });

        return result;
    } catch (error) {
        console.error("Error fetching exam Structure:", error);
        throw error;
    }
};


export async function deleteExamStructure(examStructureId) {
    try {
        const deleted = await model.examStructureModel.destroy({ where: { examStructureId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam Structure:", error);
        throw error;
    }
};

export async function updateExamStructure(examStructureId, examDetail) {
    try {
        const result = await model.examStructureModel.update(examDetail, {
            where: { examStructureId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam Structure:", error);
        throw error;
    }
};

export async function addExamType(examDetail) {
    try {
        const result = await model.examSetupTypeModel.create(examDetail);
        return result;
    } catch (error) {
        console.error("Error adding exam Structure setup type:", error);
        throw error;
    }
};

export async function getDetailByExamType(examSetupTypeId) {
  try {
    const result = await model.examSetupTypeModel.findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { examSetupTypeId },
      include: [
        {
          model: model.examStructureModel,
          as: "examStructure",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          include: [
            {
              model: model.courseModel,
              as: "courseExam",
              attributes: ["courseId","courseName", "capacity"],
            },
            {
              model: model.sessionModel,
              as: "sessionExam",
              attributes: ["sessionId","sessionName"],
            },
            {
              model: model.acedmicYearModel,
              as: "acedmicExam",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
    throw error;
  }
};

export async function getSingleExamType(courseId, sessionId, universityId, termNumber) {
  try {
    const examSetupTypeTermsInclude = {
      model: model.examSetupTypeTermModel,
      as: "examSetupTypeTerms",
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    };

    if (termNumber) {
      examSetupTypeTermsInclude.where = { term: termNumber };
      examSetupTypeTermsInclude.required = true;
    }

    const result = await model.examSetupTypeModel.findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      include: [
        examSetupTypeTermsInclude,
        {
          model: model.examStructureModel,
          as: "examStructure",
          attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
          where: { courseId, sessionId, universityId },
          include: [
            {
              model: model.courseModel,
              as: "courseExam",
              attributes: ["courseId", "courseName", "capacity"],
            },
            {
              model: model.sessionModel,
              as: "sessionExam",
              attributes: ["sessionId", "sessionName"],
            },
            {
              model: model.acedmicYearModel,
              as: "acedmicExam",
              attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            },
          ],
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("Error fetching exam structure details:", error.message);
    throw error;
  }
};


export async function deleteExamType(examSetupTypeId) {
    try {
        const deleted = await model.examSetupTypeModel.destroy({ where: { examSetupTypeId } });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting exam type:", error);
        throw error;
    }
};

export async function updateExamType(examSetupTypeId, examDetail) {
    try {
        const result = await model.examSetupTypeModel.update(examDetail, {
            where: { examSetupTypeId },
        });
        return result;
    } catch (error) {
        console.error("Error updating exam type:", error);
        throw error;
    }
};