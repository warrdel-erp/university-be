import sequelize from "./database/sequelizeConfig.js";
async function run() {
  const [results] = await sequelize.query("SELECT * FROM permission LIMIT 5;");
  console.log(results);
  process.exit(0);
}
run();
