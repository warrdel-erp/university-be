import * as model from '../models/index.js'

export async function addPo(poData) {    
    try {
        const result = await model.poModel.create(poData);
        return result;
    } catch (error) {
        console.error("Error in add Po :", error);
        throw error;
    }
};

export async function getPoDetails(universityId,instituteId,role,acedmicYearId) {
    try {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const Po = await model.poModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:whereClause,
            include:[
                {
                    model: model.courseModel,
                    as: "courseDetail",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.subjectModel,
                            as:'subjectInfo',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
            ]
        });

        return Po;
    } catch (error) {
        console.error('Error fetching Po details:', error);
        throw error;
    }
}

export async function getSinglePoDetails(PoId,universityId) {
    try {
        const Po = await model.poModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { PoId },
            include:[
                {
                    model: model.buildingModel,
                    as: "PoBuilding",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                },
            ]
        });

        return Po;
    } catch (error) {
        console.error('Error fetching Po details:', error);
        throw error;
    }
}

export async function updatePo(PoId, poData) {
    try {
        const result = await model.poModel.update(poData, {
            where: { PoId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Po creation ${PoId}:`, error);
        throw error; 
    }
}

export async function deletePo(PoId) {
    const deleted = await model.poModel.destroy({ where: { PoId: PoId } });
    return deleted > 0;
}