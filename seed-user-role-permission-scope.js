import sequelize from "./database/sequelizeConfig.js";

async function run() {
  try {
    const [[user]] = await sequelize.query("SELECT user_id FROM users WHERE email = 'aadi28x6@gmail.com' LIMIT 1;");
    if (!user) {
      console.log("User not found");
      return;
    }
    const userId = user.user_id;

    const [[adminRole]] = await sequelize.query("SELECT role_id FROM role WHERE role = 'Super Admin' OR role = 'Admin' ORDER BY role DESC LIMIT 1;");
    const roleId = adminRole ? adminRole.role_id : 1; 

    // Insert into user_role_permission_scope
    const [permissions] = await sequelize.query("SELECT permission_id FROM permission;");
    
    await sequelize.query(`DELETE FROM user_role_permission_scope WHERE user_id = ${userId};`);

    // In userRolePermissionModel.js, permission column is STRING (permission key). Wait, the DB table `permission` has `permission_id` but what is the string?
    // Let's get the permission strings from const/permissions.js or the DB table.
    // userRolePermissionModel specifies: permission: { type: DataTypes.STRING(255) }
    // Wait, the new API returns PERMISSIONS values.
    
    // Instead of querying `permission` table, let's just insert all permissions from const/permissions.js.
    const { PERMISSIONS } = await import("./const/permissions.js");
    const validPermissions = Object.values(PERMISSIONS).map(p => p.value);

    const values = validPermissions.map(p => `(${roleId}, ${userId}, '${p}', 'UNIVERSITY', NULL, NOW(), NOW())`).join(',');
    
    if (values) {
        await sequelize.query(`INSERT INTO user_role_permission_scope (role_id, user_id, permission, scope, resource_id, created_at, updated_at) VALUES ${values};`);
    }

    console.log("Successfully seeded user_role_permission_scope for aadi28x6@gmail.com with UNIVERSITY scope!");
  } catch(e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();
