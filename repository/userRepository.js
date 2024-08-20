import { Op } from 'sequelize';
import * as model from '../models/index.js'

export async function register(data) {    
	const result = await model.userModel.create(data)
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