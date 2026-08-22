import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

export async function addBlueprint(blueprintData) {
    try {
        const result = await scoped(model.questionPaperBlueprintModel).create(blueprintData);
        return result;
    } catch (error) {
        console.error("Error adding question paper blueprint:", error);
        throw error;
    }
}

export async function getBlueprints(filters = {}) {
    try {
        const { subjectId, ownerId } = filters;

        const whereClause = {
            ...(subjectId && { subjectId }),
            ...(ownerId && { createdBy: ownerId }),
        };

        const rows = await scoped(model.questionPaperBlueprintModel).findAll({
            where: whereClause,
            include: [
                {
                    model: model.subjectModel,
                    as: "subject",
                    attributes: ["subjectId", "subjectName", "subjectCode"],
                    where: buildScope(model.subjectModel),
                    required: false,
                    include: [
                        {
                            model: model.examScheduleModel,
                            as: "scheduleSubject",
                            attributes: ["duration", "maximumMarks", "examScheduleId"],
                            required: false,
                        }
                    ]
                },
                {
                    model: model.userModel,
                    as: "creator",
                    attributes: ["userId", "userName"],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return rows;
    } catch (error) {
        console.error("Error fetching blueprints:", error.message);
        throw error;
    }
}

export async function deleteBlueprint(id, ownerId) {
    try {
        const where = { id };
        if (ownerId != null) {
            where.createdBy = ownerId;
        }
        const existing = await scoped(model.questionPaperBlueprintModel).findOne({
            where,
            attributes: ['id'],
        });
        if (!existing) {
            return false;
        }
        const deleted = await scoped(model.questionPaperBlueprintModel).destroy({
            where,
        });
        return deleted > 0;
    } catch (error) {
        console.error("Error deleting blueprint:", error);
        throw error;
    }
}

export async function getBlueprintById(id, ownerId) {
    try {
        const where = { id };
        if (ownerId != null) {
            where.createdBy = ownerId;
        }
        const result = await scoped(model.questionPaperBlueprintModel).findOne({
            where,
        });
        return result;
    } catch (error) {
        console.error("Error fetching blueprint by id:", error);
        throw error;
    }
}
