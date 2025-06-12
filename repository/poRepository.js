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

export async function getSinglePoDetails(poId,universityId) {
    try {
        const Po = await model.poModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { poId },
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

export async function updatePo(poId, poData) {
    try {
        const result = await model.poModel.update(poData, {
            where: { poId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Po creation ${poId}:`, error);
        throw error; 
    }
}

export async function deletePo(poId) {
    const deleted = await model.poModel.destroy({ where: { poId: poId } });
    return deleted > 0;
}