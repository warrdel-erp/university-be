import { findEmailByEmail } from './repository/userRepository.js';
import { getUserPermissions } from './utility/authEngine.js';

async function run() {
    const user = await findEmailByEmail('admin@example.com'); // wait, I need the user's email.
    console.log(user);
}
run();
