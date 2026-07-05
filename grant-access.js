import sequelize from "./database/sequelizeConfig.js";
async function run() {
  try {
    const [[user]] = await sequelize.query("SELECT user_id FROM users WHERE email = 'aadi28x6@gmail.com' LIMIT 1;");
    if (!user) {
      console.log("User not found");
      return;
    }
    const userId = user.user_id;

    // Get Admin role
    const [[adminRole]] = await sequelize.query("SELECT role_id FROM role WHERE role = 'Super Admin' OR role = 'Admin' ORDER BY role DESC LIMIT 1;");
    const roleId = adminRole ? adminRole.role_id : 1; 

    // Clear old user_roles
    await sequelize.query(`DELETE FROM user_roles WHERE user_id = ${userId};`);
    
    // Insert into user_roles
    await sequelize.query(`INSERT INTO user_roles (user_id, role_id) VALUES (${userId}, ${roleId});`);
    
    // Get UNIVERSITY scope id
    const [[scope]] = await sequelize.query("SELECT scope_id FROM scopes WHERE scope_key = 'UNIVERSITY' LIMIT 1;");
    if (!scope) {
        console.log("UNIVERSITY scope not found in DB!");
        return;
    }
    const scopeId = scope.scope_id;

    // Get all permissions
    const [permissions] = await sequelize.query("SELECT permission_id FROM permission;");

    // Clear old user_permissions
    await sequelize.query(`DELETE FROM user_permissions WHERE user_id = ${userId};`);

    // Insert all into user_permissions using UNIVERSITY scope
    const values = permissions.map(p => `(${userId}, ${p.permission_id}, ${scopeId}, 1)`).join(',');
    if (values) {
        await sequelize.query(`INSERT INTO user_permissions (user_id, permission_id, scope_id, is_allowed) VALUES ${values};`);
    }

    console.log("Granted Admin role and all permissions with UNIVERSITY scope to user aadi28x6@gmail.com");
  } catch(e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();
