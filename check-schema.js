import sequelize from "./database/sequelizeConfig.js";
async function run() {
  const [results] = await sequelize.query("DESCRIBE user_role_permission;");
  console.log(results);
  process.exit(0);
}
run();
