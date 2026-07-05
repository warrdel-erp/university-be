import sequelize from "./database/sequelizeConfig.js";
import * as model from "./models/index.js";

async function run() {
  const userId = 2; // Let's try userId 2 or whatever exists. We can just do findAll without where to see what comes out.
  const roleEntries = await model.userRolePermissionModel.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('userRole.role')), 'roleName'],
      [sequelize.col('userRole.role_id'), 'roleId']
    ],
    include: [
      {
        model: model.roleModel,
        as: 'userRole',
        attributes: []
      }
    ],
    raw: true,
    limit: 1
  });
  console.log("roleEntries output:");
  console.log(roleEntries);
  process.exit();
}
run();
