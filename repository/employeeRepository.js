import * as model from '../models/index.js'

export async function addEmployee(data) {    
    try {
        const result = await model.employeeModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add employee :", error);
        throw error;
    }
};

export async function getAllEmployee() {
    try {
        const result = await model.employeeModel.findAll({
            attributes: ["employeeId","employeeName","employeeCode","dateOfBirth","workingHours"],
            include:[
               {
                model:model.employeeOfficeModel,
                as:'office',
                attributes: ["joiningDate"] ,
               },
               {
                model: model.employeeMetaDataModel,
                as: "employeeMetaData",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include :[
                    {
                        model: model.employeeCodeMasterType,
                        as: "typess",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include :[
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ]
                    },
                ]
            },
            ]
        });      
        return result;
    } catch (error) {
        console.error(`Error in getting all employee :`, error);
        throw error;
    };
};

export async function getSingleEmployeeDetails(employeeId) {
    try {
        const result = await model.employeeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
               {
                model:model.employeeAddressModel,
                as:'address',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeOfficeModel,
                as:'office',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.emplopeeRoleModel,
                as:'role',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeSkillModel,
                as:'skill',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeDocumentsModel,
                as:'qualification',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeQualificationModel,
                as:'documents',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeExperianceModel,
                as:'experiance',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeAchievementModel,
                as:'achievements',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeWardModel,
                as:'ward',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeActivityModel,
                as:'activty',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeReferenceModel,
                as:'reference',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeResearchModel,
                as:'research',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeLongLeaveModel,
                as:'longLeave',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model: model.employeeMetaDataModel,
                as: "employeeMetaData",
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include :[
                    {
                        model: model.employeeCodeMasterType,
                        as: "typess",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        include :[
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ]
                    },
                ]
            },
            ],
            where: {
                employeeId: employeeId
            },
        });              
        return result;
    } catch (error) {
        console.error(`Error in getting employee for ${employeeId} :`, error);
        throw error;
    };
};

export async function deleteEmployeeDetail (employeeId) {
    try {
        const result = await model.employeeModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};