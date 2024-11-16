import { Op } from 'sequelize';
import * as model from '../models/index.js';

export async function register(data) {    
	const result = await model.userModel.create(data)
	return result
}

export async function adminUser(data,transaction) { 
	const result = await model.userStudentEmployeeModel.create(data,{transaction})
	return result
}

export async function findEmailByEmail(email) {
	const result = await model.userModel.findOne({
		where: {
			email: {
				[Op.eq]: email
			}
		}
	})
	return result;
};

export async function adminRegisterStudentAndEmployee(data,transaction) {  
	const result = await model.userModel.bulkCreate(data,{transaction})
	return result
}

export async function getAdminRegisterStudent() {
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
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']}
				},
				{
					model:model.studentModel,
					as:'studentDetails',
					attributes:["studentId",'scholarNumber','enrollNumber','firstName'],
                    include:[{
                        model:model.courseModel,
                        as:'course',
                        attributes:["courseName",'courseId','courseCode'],
                    },
                    {
                        model:model.classStudentMapperModel,
                        as:'studentMapped',
                        attributes:{exclude:["createdAt",'updatedAt','deletedAt','createdBy','student_id','class_sections_id']},
                        include:[
                            {
                            model:model.classSectionModel,
                            as:'studentSection',
                            attributes:{exclude:["createdAt",'updatedAt','deletedAt','createdBy','student_id','class_sections_id']},
                        }
                        ]
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
}

export async function getAdminRegisterEmployee() {
    try {
        const user = await model.userStudentEmployeeModel.findAll({
			where:{
				employee_id: {
                    [Op.ne]: null
                }
			},
            attributes: ["userStudentEmployeeId", "employeeId", "userId"] ,
			include: [
				{
					model:model.userModel,
					as:'userDetails',
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']}
				},
				{
					model:model.employeeModel,
					as:'employeeDetails',
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']}
				}
			]
        });

        return user;
    } catch (error) {
        console.error('Error fetching adimn Register employee details:', error);
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
}


export async function saveToUserRolePermission(data,transaction) { 
	const result = await model.userRolePermissionModel.bulkCreate(data,{transaction})
	return result
}


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