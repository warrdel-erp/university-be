import sequelize from "./database/sequelizeConfig.js";
sequelize.query("DESCRIBE faculity_load").then(([results]) => {
  console.log(results);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
