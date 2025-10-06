import * as model from '../models/index.js'

export async function addEmployee(data,transaction) {    
    try {
        const result = await model.employeeModel.create(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add employee :", error);
        throw error;
    }
};

export async function updateEmployee(employeeId, data, transaction) {
  try {
    const result = await model.employeeModel.update(
      data,
      { where: { employeeId }, transaction }
    );
    return result;
  } catch (error) {
    console.error("Error in update employee:", error);
    throw error;
  }
};

export async function getAllEmployee(universityId,campusId,instituteId,acedmicYearId,headInstituteId,role) {
    try {
        const whereClause = {
            ...(campusId && { campusId }),
            ...(instituteId && { instituteId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && headInstituteId && { instituteId: headInstituteId }),
        };
        const result = await model.employeeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where : whereClause,
            include:[
                {
                    model:model.userModel,
                    as:'userEmployee',
                    attributes:["universityId","userId"],
                    where: {
                        universityId:universityId
                    },  
                },
               {
                model:model.employeeOfficeModel,
                as:'office',
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
            ]
        });      
        return result;
    } catch (error) {
        console.error(`Error in getting all employee :`, error);
        throw error;
    };
};

export async function getSingleEmployeeDetails(employeeId,universityId) {
    try {
        const result = await model.employeeModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include:[
                {
                    model:model.userModel,
                    as:'userEmployee',
                    attributes:["universityId","userId"],
                    where: {
                        universityId:universityId
                    },  
                },
               {
                model:model.employeeAddressModel,
                as:'address',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
               },
               {
                model:model.employeeCorAddressModel,
                as:'CorsAddress',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                // include:[
                //     {
                //         model: model.employeeCodeMasterType,
                //         as: "codeMasterCountry",
                //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                //         include :[
                //             {
                //                 model: model.employeeCodeMaster,
                //                 as: "codes",
                //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                //             },
                //         ]
                //     },
                //     {
                //         model: model.employeeCodeMasterType,
                //         as: "codeMasterState",
                //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                //         include :[
                //             {
                //                 model: model.employeeCodeMaster,
                //                 as: "codes",
                //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                //             },
                //         ]
                //     },
                //     {
                //         model: model.employeeCodeMasterType,
                //         as: "codeMasterCity",
                //         attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                //         include :[
                //             {
                //                 model: model.employeeCodeMaster,
                //                 as: "codes",
                //                 attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                //             },
                //         ]
                //     },
                // ]
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
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterEmployeeSkill",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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
               {
                model:model.employeeDocumentsModel,
                as:'qualification',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterDocumentQualification",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                        include :[
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ]
                    },
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterDocumentDegreeLevel",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
                        include :[
                            {
                                model: model.employeeCodeMaster,
                                as: "codes",
                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            },
                        ]
                    },
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterDocumentStream",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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
               {
                model:model.employeeQualificationModel,
                as:'documents',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterQualificationDocuments",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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
               {
                model:model.employeeExperianceModel,
                as:'experiance',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterExperienceType",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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
               {
                model:model.employeeAchievementModel,
                as:'achievements',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterAchievementCategory",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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
                model:model.employeeFilesModel,
                as:'files',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","employeeId"] },
               },
               {
                model:model.employeeLongLeaveModel,
                as:'longLeave',
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                include:[
                    {
                        model: model.employeeCodeMasterType,
                        as: "codeMasterLeaveType",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id","createdBy"] },
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


export async function createEmployeeWithDetails(employeeData, officeData, addressData, transaction) {
  //  Create Employee
  const employee = await model.employeeModel.create(employeeData, { transaction });
  console.log(`>>>>>employee`,employee);
  

  // Create Employee Office
  if (officeData) {
    officeData.employeeId = employee.employeeId;
    await model.employeeOfficeModel.create(officeData, { transaction });
  }

  //  Create Employee Address
  if (addressData) {
    addressData.employeeId = employee.employeeId;
    await model.employeeAddressModel.create(addressData, { transaction });
  }

  return employee;
}