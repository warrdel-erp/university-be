import sequelize from "./database/sequelizeConfig.js";
import { getMyDetails } from "./services/userServices.js";

async function run() {
  try {
    const [[user]] = await sequelize.query("SELECT user_id FROM users WHERE email = 'aadi28x6@gmail.com' LIMIT 1;");
    const data = await getMyDetails(user.user_id);
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}
run();
