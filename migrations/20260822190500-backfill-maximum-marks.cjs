"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Perform a raw update using a join query to backfill maximum_marks from weightage_percentage
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      INNER JOIN examination_session ex ON es.examination_session_id = ex.examination_session_id
      INNER JOIN assessment_plan_component apc ON ex.assessment_type_id = apc.exam_setup_type_id
      SET es.maximum_marks = apc.weightage_percentage
      WHERE es.maximum_marks IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // No-op for revert, or set maximum_marks to NULL if requested
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule SET maximum_marks = NULL
    `);
  },
};
