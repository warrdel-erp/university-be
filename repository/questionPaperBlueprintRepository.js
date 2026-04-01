import * as model from "../models/index.js";

/**
 * Add a new question paper blueprint
 * @param {Object} blueprintData - The data for the blueprint
 * @returns {Promise<Object>} - The created blueprint
 */
export async function addBlueprint(blueprintData) {
    try {
        const result = await model.questionPaperBlueprintModel.create(blueprintData);
        return result;
    } catch (error) {
        console.error("Error adding question paper blueprint:", error);
        throw error;
    }
}

/**
 * Get blueprints with filters
 * @param {number} universityId - The university ID
 * @param {Object} filters - Filters like subjectId
 * @returns {Promise<Array>} - List of blueprints
 */
export async function getBlueprints(universityId, filters = {}) {
    try {
        const { subjectId } = filters;

        const whereClause = {
            ...(universityId && { universityId }),
            ...(subjectId && { subjectId }),
        };

        const rows = await model.questionPaperBlueprintModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.subjectModel,
                    as: "subject",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                },
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return rows;
    } catch (error) {
        console.error("Error fetching blueprints:", error.message);
        throw error;
    }
}

/**
 * Delete a blueprint
 * @param {number} id - The blueprint ID
 * @param {number} universityId - The university ID to ensure ownership
 * @returns {Promise<boolean>} - True if deleted
 */
export async function deleteBlueprint(id, universityId) {
    try {
        const deleted = await model.questionPaperBlueprintModel.destroy({
            where: { id, universityId }
        });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting blueprint:", error);
        throw error;
    }
}
