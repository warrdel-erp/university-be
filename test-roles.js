import sequelize from "./database/sequelizeConfig.js";
import * as model from "./models/index.js";

async function run() {
  const userId = 1;
  const roleEntries = await model.userRolePermissionModel.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('userRole.role')), 'roleName'],
      [sequelize.col('userRole.role_id'), 'roleId']
    ],
    where: { user_id: userId },
    include: [
      {
        model: model.roleModel,
        as: 'userRole',
        attributes: []
      }
    ],
    raw: true
  });
  console.log("roleEntries:", roleEntries);
  process.exit();
}
run();
