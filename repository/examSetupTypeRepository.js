import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function getExamSetupTypes(filters) {
    try {
        const { courseId, term } = filters;

        const result = await scoped(model.examSetupTypeModel).findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "updatedBy", "createdBy"],
            },
            include: [
                {
                    model: model.examSetupTypeTermModel,
                    as: "examSetupTypeTerms",
                    where: {
                        ...buildScope(model.examSetupTypeTermModel),
                        ...(courseId && { courseId }),
                        ...(term && { term }),
                    },
                    attributes: [],
                    required: !!(courseId || term),
                },
            ],
        });
        return result;
    } catch (error) {
        console.error("Error fetching exam setup types:", error);
        throw error;
    }
}
