import * as model from "../models/index.js";

export async function getExamSetupTypes(filters) {
    try {
        const { courseId, term, universityId } = filters;

        const result = await model.examSetupTypeModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"]
            },
            include: [
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerms",
                    where: {
                        ...(courseId && { courseId }),
                        ...(term && { term }),
                        ...(universityId && { universityId })
                    },
                    attributes: []
                },
                {
                    model: model.examStructureModel,
                    as: "examStructure",
                    attributes: ["examStructureId", "totalMarks"]
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam setup types:", error);
        throw error;
    }
}
