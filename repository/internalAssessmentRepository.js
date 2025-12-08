import * as model from "../models/index.js";

export async function addInternalAssessment(data) {
    return await model.internalAssessmentModel.create(data);
}

export async function getAllInternalAssessment(examSetupTypeId) {
    return await model.internalAssessmentModel.findAll({
        where:{
            examSetupTypeId
        },
        include: [
            { model: model.subjectModel, as: "assessmentSubject",   attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] } },
            { model: model.semesterModel, as: "assessmentSemester" ,    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }},
            { model: model.examSetupTypeModel, as: "assessmentExamType",     attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                include:[
                    {
                        model:model.syllabusDetailsModel,
                        as:'syllabusDetailsExam',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    },
                    {
                        model:model.examStructureModel,
                        as:'examStructure',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    }
                ]
            },
        ],
        order: [["createdAt", "DESC"]]
    });
};

export async function getInternalAssessmentById(examAssessmentId) {
    return await model.internalAssessmentModel.findOne({
        where:{
            examAssessmentId
        },
        include: [
            { model: model.subjectModel, as: "assessmentSubject",   attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] } },
            { model: model.semesterModel, as: "assessmentSemester" ,    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }},
            { model: model.examSetupTypeModel, as: "assessmentExamType",     attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                include:[
                    {
                        model:model.syllabusDetailsModel,
                        as:'syllabusDetailsExam',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    },
                    {
                        model:model.examStructureModel,
                        as:'examStructure',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    }
                ]
            },
        ],
    });
}

export async function updateInternalAssessment(examAssessmentId, data) {
    try {
        return await model.internalAssessmentModel.update(
            data,
            { where: { examAssessmentId } }
        );
    } catch (error) {
        console.error(
            `Error updating internal assessment ID ${examAssessmentId}:`,
            error
        );
        throw error;
    }
};

export async function deleteInternalAssessment(examAssessmentId) {
    return await model.internalAssessmentModel.destroy({ where: { examAssessmentId } });
};

export async function evaluationInternalAssessment(subjectId,employeeId) {
    
    return await model.internalAssessmentModel.findOne({
        where:{
            subjectId,employeeId
        },
        include: [
            { model: model.subjectModel, as: "assessmentSubject",   attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] } },
            { model: model.semesterModel, as: "assessmentSemester" ,    attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
            include:[
                {
                    model:model.studentModel,
                    as:'studentSemester',
                    attributes:["studentId","scholarNumber","firstName","middleName","lastName"],
                    include:[
                        {
                            model:model.assessmentEvaluationModel,
                            as:'studentresult',
                            attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                        }
                    ]
                }
            ]
            },
            { model: model.examSetupTypeModel, as: "assessmentExamType",     attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                include:[
                    {
                        model:model.syllabusDetailsModel,
                        as:'syllabusDetailsExam',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    },
                    {
                        model:model.examStructureModel,
                        as:'examStructure',
                        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }
                    }
                ]
            },
            { model: model.employeeModel, as: "employees",     attributes: ["employeeId","employeeCode", "employeeName"] },
        ],
    });
};


export async function bulkInsertEvaluation(dataArray) {
  try {
    return await model.assessmentEvaluationModel.bulkCreate(dataArray);
  } catch (error) {
    console.error("Repository Error evalution:", error);
    throw error;
  }
};

export async function updateEvaluation(id, data) {
  return await model.assessmentEvaluationModel.update(data, {
    where: { assessmentEvalutionId: id }
  });
}