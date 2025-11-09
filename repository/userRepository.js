import { Op } from 'sequelize';
import * as model from '../models/index.js';

export async function register(data) {    
	const result = await model.userModel.create(data)
	return result
}

export async function adminUser(data,transaction) { 
	const result = await model.userStudentEmployeeModel.create(data,{transaction})
	return result
};

export async function findEmailByEmail(email) {
    const result = await model.userModel.findOne({
        where: {
            email: {
                [Op.eq]: email
            }
        }
    });

    if (!result) {
        console.log('User not found');
        return null;
    }

    const instituteId = result.dataValues.instituteId;

    const institute = await model.instituteModel.findOne({
        where: {
            instituteId: {
                [Op.eq]: instituteId
            }
        }
    });

    result.dataValues.instituteName = institute?.dataValues?.instituteName || null;

    return result;
};

export async function adminRegisterStudentAndEmployee(data,transaction) {  
	const result = await model.userModel.create(data,{transaction})
	return result
};

export async function getAdminRegisterStudent(universityId,instituteId,role) {
    try {
        const user = await model.userStudentEmployeeModel.findAll({
			where:{
				student_id: {
                    [Op.ne]: null
                }
			},
            attributes: ["userStudentEmployeeId","userId","studentId","employeeId"] ,
			include: [
				{
					model:model.userModel,
					as:'userDetails',
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']},
                    where :{universityId:universityId}
				},
				{
					model:model.studentModel,
					as:'studentDetails',
                    required: true,
					attributes:["studentId",'scholarNumber','enrollNumber','firstName'],
                    include:[{
                        model:model.courseModel,
                        as:'course',
                        attributes:["courseName",'courseId','courseCode',"capacity"],
                    },
                    {
                        model:model.classStudentMapperModel,
                        as:'studentMapped',
                        attributes:{exclude:["createdAt",'updatedAt','deletedAt','createdBy','student_id','class_sections_id']},
                    },
                    {
                        model:model.classSectionModel,
                        as:'studentSections',
                        attributes:{exclude:["createdAt",'updatedAt','deletedAt','createdBy']},
                    },
                    {
                        model : model.semesterModel,
                        as:'studentSemester',
                        attributes:{exclude:["createdAt",'updatedAt','deletedAt']},
                    }
                ]
				}
			]
        });

        return user;
    } catch (error) {
        console.error('Error fetching adimn Register student details:', error);
        throw error;
    }
};

export async function getAdminRegisterEmployee(universityId,instituteId,role) {
    const whereClause = {
        ...(universityId && { universityId }),
        ...(role === 'Head' && { institute_id: instituteId }),
        role: {
            [Op.ne]: 'Student'
        }
    };
    const whereClauseEmployee = {
        ...(role === 'Head' && { institute_id: instituteId }),
    };
    try {
        const users = await model.userStudentEmployeeModel.findAll({
            where: {
                employee_id: {
                    [Op.ne]: null
                }
            },
            attributes: ["userStudentEmployeeId", "employeeId", "userId"],
            include: [
                {
                    model: model.userModel,
                    as: 'userDetails',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where :whereClause,
                    // where: {
                    //     // universityId,
                    //     role: {
                    //       [Op.ne]: 'Student'                        
                    //     }
                    //   }                    
                },
                {
                    model: model.employeeModel,
                    as: 'employeeDetails',
                    required: true,
                    attributes: ['employee_id','employeeName'],
                    where:whereClauseEmployee,
                    include: [
                        {
                            model: model.roleModel,
                            as: 'employeeRole',
                            attributes: ['roleId', 'role']
                        }
                    ]
                }
            ]
        });

        const simplified = users.map(user => ({
            userStudentEmployeeId: user.userStudentEmployeeId,
            userId: user.userId,
            userData : user,
            employeeId: user.employeeId,
            roleId: user?.employeeDetails?.employeeRole?.roleId,
            role: user?.employeeDetails?.employeeRole?.role
        }));
        return simplified;
    } catch (error) {
        console.error('Error fetching admin register employee details:', error);
        throw error;
    }
};

export async function changePassword(email,data) {
    try {
        const result = await model.userModel.update(data, {
            where: { email }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating self password or login ${email}:`, error);
        throw error; 
    }
};

export async function saveToUserRolePermission(data,transaction) { 
	const result = await model.userRolePermissionModel.bulkCreate(data,{transaction})
	return result
};

export async function getUserRoleAndPermissionsByUserId(userId) {
    try {
        const rolePermissions = await model.userRolePermissionModel.findAll({
            attributes: [
                "role_id",
				"permission_id",
                "user_id"
            ],
            where: { user_id: userId },
            include: [
                {
                    model: model.userModel,
                    as: 'user',
                    attributes: ["userName", "email","userId"],
                },
                {
                    model: model.roleModel,
                    as: 'userRole',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                },
                {
                    model: model.permissionModel,
                    as: 'userPermission',
                    attributes: ["permissionId","permission"]
                }
            ]
        });

        return rolePermissions;
    } catch (error) {
        console.error('Error fetching Role Permission details:', error);
        throw error;
    }
};

export async function findStatusByUserId(userId) {
	const result = await model.userModel.findOne({
		where: {
			userId: userId
		}
	})
	return result;
};

export async function changeStatus(userId,data) {    
    
    try {
        const result = await model.userModel.update(data, {
            where: { userId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating status ${userId}:`, error);
        throw error; 
    }
};

export async function headRegister(data, transaction) {
    try {
        const result = await model.userModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error('Error in userRepository.register:', error);
        throw new Error('Failed to create user');
    }
};


export async function updateUser(userId,data) {    
    
    try {
        const result = await model.userModel.update(data, {
            where: { userId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error);
        throw error; 
    }
};