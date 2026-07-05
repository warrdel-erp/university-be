import sequelize from "./database/sequelizeConfig.js";
async function run() {
  const [results] = await sequelize.query("SHOW TABLES;");
  results.forEach(r => console.log(Object.values(r)[0]));
  process.exit(0);
}
run();
