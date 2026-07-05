import sequelize from "./database/sequelizeConfig.js";
async function run() {
  const [results] = await sequelize.query("DESCRIBE users;");
  console.log(results);
  process.exit(0);
}
run();
