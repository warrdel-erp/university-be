import sequelize from "./database/sequelizeConfig.js";
import userRolePermissionModel from "./models/userRolePermissionModel.js";

async function run() {
  try {
    console.log("Syncing user_role_permission_scope table...");
    await userRolePermissionModel.sync({ alter: true });
    console.log("Table synced successfully!");
  } catch(e) {
    console.error("Error syncing table:", e);
  } finally {
    process.exit(0);
  }
}
run();
