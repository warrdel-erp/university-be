import { getUserPermissions, getAccessFilter } from './utility/authEngine.js';

async function test() {
    try {
        const userId = 88;
        const roleId = 14;
        const perms = await getUserPermissions(userId, roleId);
        console.log("Perms:", JSON.stringify(perms, null, 2));

        const userObj = { userId: 88, defaultRoleId: 14 };
        const filter = await getAccessFilter(userObj, 'perm_dcd97633', 'institute', 14);
        console.log("Filter:", filter);
    } catch (e) {
        console.error(e);
    }
}
test();
