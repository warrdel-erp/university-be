"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Running migration to backfill university_id, institute_id, and acedmic_year_id on examination_session_term...");
    
    await queryInterface.sequelize.query(`
      UPDATE examination_session_term est
      JOIN examination_session es ON est.examination_session_id = es.examination_session_id
      SET est.university_id = es.university_id,
          est.institute_id = es.institute_id,
          est.acedmic_year_id = es.acedmic_year_id
      WHERE est.university_id IS NULL 
         OR est.institute_id IS NULL 
         OR est.acedmic_year_id IS NULL
    `);
    
    console.log("Backfill migration completed successfully.");
  },

  async down(queryInterface, Sequelize) {
    // Optionally set them back to NULL if rolled back
    await queryInterface.sequelize.query(`
      UPDATE examination_session_term
      SET university_id = NULL,
          institute_id = NULL,
          acedmic_year_id = NULL
    `);
  }
};
