import { findEmailByEmail } from './repository/userRepository.js';
import * as model from './models/index.js';

async function test() {
    try {
        const user = await model.userModel.findByPk(88);
        console.log("User defaultRoleId:", user.defaultRoleId);
        console.log("User email:", user.email);
    } catch (e) {
        console.error(e);
    }
}
test();
