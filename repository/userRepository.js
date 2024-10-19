import { Op } from 'sequelize';
import * as model from '../models/index.js'

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
            attributes: ["userStudentEmployeeId","userId","studentId"] ,
			include: [
				{
					model:model.userModel,
					as:'userDetails',
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']}
				},
				{
					model:model.studentModel,
					as:'studentDetails',
					attributes:{exclude:["createdAt",'updatedAt','deletedAt']}
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
