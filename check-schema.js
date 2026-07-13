import sequelize from "./database/sequelizeConfig.js";
async function run() {
  const [sectionCreate] = await sequelize.query("SHOW CREATE TABLE teacher_section_mapping;");
  console.log("teacher_section_mapping CREATE:", sectionCreate[0]['Create Table']);
  const [subjectCreate] = await sequelize.query("SHOW CREATE TABLE teacher_subject_mapping;");
  console.log("teacher_subject_mapping CREATE:", subjectCreate[0]['Create Table']);
  process.exit(0);
}
run();
