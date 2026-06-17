import * as model from '../models/index.js'

export async function addTimeTableName(data, transaction) {
    try {
        const result = await model.timeTableStructureModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in create time table name:", error);
        throw error;
    }
}

export async function addTimeTable(data, transaction) {
    try {
        const result = await model.timeTableStructurePeriodsModel.bulkCreate(data.timeSlots, { transaction });
        return result;
    } catch (error) {
        console.error("Error in create time table:", error);
        throw error;
    }
}

export async function getTimeTableStructures(universityId, instituteId, acedmicYearId, role, courseId, sessionId) {
    try {
        const where = {
            ...(courseId && { courseId }),
            ...(universityId && { universityId }),
            ...(sessionId && { sessionId }),
        };

        if (courseId) {
            if (instituteId) where.instituteId = instituteId;
            if (acedmicYearId) where.acedmicYearId = acedmicYearId;
        } else {
            if (acedmicYearId) where.acedmicYearId = acedmicYearId;
            if (role === "Head" && instituteId) where.instituteId = instituteId;
        }

        return await model.timeTableStructureModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where,
            include: [
                {
                    model: model.sessionModel,
                    as: "timeTableSession",
                    attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate", "acedmicYearId", "instituteId"],
                    required: false,
                },
                {
                    model: model.timeTableStructurePeriodsModel,
                    as: "timeTableName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.courseModel,
                    as: "timeTableStructureCourse",
                    attributes: ["courseId", "courseName", "courseCode"],
                    required: false,
                },
            ],
        });
    } catch (error) {
        console.error(`Error in getting time table:`, error);
        throw error;
    }
}

export async function getSingleTimeTableById(timeTableCreationId, universityId) {
    try {
        return await model.timeTableStructurePeriodsModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: { timeTableCreationId },
            include: [
                {
                    model: model.timeTableStructureModel,
                    as: "timeTableName",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: universityId ? { universityId } : {},
                    include: [
                        {
                            model: model.sessionModel,
                            as: "timeTableSession",
                            attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate", "acedmicYearId", "instituteId"],
                            required: false,
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error(`Error in getting time table by id:`, error);
        throw error;
    }
}

export async function updateTimeTable(timeTableCreationId, info) {
    try {
        return await model.timeTableStructurePeriodsModel.update(info, {
            where: { timeTableCreationId }
        });
    } catch (error) {
        console.error(`Error updating time table ${timeTableCreationId} :`, error);
        throw error;
    }
}

export async function deleteTimeTable(timeTableCreationId) {
    try {
        await model.timeTableStructurePeriodsModel.destroy({
            where: { timeTableCreationId },
            individualHooks: true
        });
        return { message: `time table creation deleted successfully for time Table Creation Id${timeTableCreationId}` };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
}
