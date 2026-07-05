import sequelize from './database/sequelizeConfig.js';
import * as model from './models/index.js';
async function run() {
  const institutes = await model.instituteModel.findAll({ raw: true });
  console.log('Institutes:', institutes);
  process.exit(0);
}
run();
