'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const setupTypeInfo = await queryInterface.describeTable('exam_setup_type');
    const tables = await queryInterface.showAllTables();

    // 1. Seed course_id & session_id from exam_structure into exam_setup_type if both table & column exist
    if (setupTypeInfo.exam_structure_id && tables.includes('exam_structure')) {
      try {
        await queryInterface.sequelize.query(`
          UPDATE exam_setup_type est
          INNER JOIN exam_structure es ON est.exam_structure_id = es.exam_structure_id
          SET est.course_id = COALESCE(est.course_id, es.course_id),
              est.session_id = COALESCE(est.session_id, es.session_id)
          WHERE est.exam_structure_id IS NOT NULL;
        `);
        console.log("Successfully seeded course_id and session_id from exam_structure into exam_setup_type");
      } catch (e) {
        console.log("Seeding course_id and session_id error:", e.message);
      }
    }

    // 2. Remove exam_structure_id column
    if (setupTypeInfo.exam_structure_id) {
      try {
        await queryInterface.removeColumn('exam_setup_type', 'exam_structure_id');
      } catch (e) {
        console.log("Column exam_structure_id remove error:", e.message);
      }
    }

    // 3. Drop exam_structure table
    if (tables.includes('exam_structure')) {
      await queryInterface.dropTable('exam_structure');
    }
  },

  async down(queryInterface, Sequelize) {
    // No-op
  }
};
