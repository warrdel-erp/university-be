import { findClassSectionTermsWithRoutines } from './repository/timeTablecreateRepository.js';
import { gettimeTableCreateDetails } from './services/timeTableCreateServices.js';
import sequelize from './database/sequelizeConfig.js';

async function run() {
  try {
    const res = await gettimeTableCreateDetails({ courseId: 34 });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
