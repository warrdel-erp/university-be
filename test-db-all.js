import sequelize from "./database/sequelizeConfig.js";

async function check() {
  const tables = [
    "employee_address",
    "employee_cor_address",
    "employee_role",
    "employee_skill",
    "employee_documents",
    "employee_qualification",
    "employee_experiance",
    "employee_achievement",
    "employee_ward",
    "employee_activity",
    "employee_reference",
    "employee_research",
    "employee_long_leave",
    "employee_meta_data",
    "employee_files",
  ];

  for (const t of tables) {
    try {
        const [cols] = await sequelize.query(`DESCRIBE ${t}`);
        const hasEmployeeId = cols.find(c => c.Field === "employee_id");
        const hasUserId = cols.find(c => c.Field === "user_id");
        console.log(`${t}: employee_id=${!!hasEmployeeId}, user_id=${!!hasUserId}`);
    } catch(e) {
        console.log(`Failed for ${t}`);
    }
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
