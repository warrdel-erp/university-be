'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Match batch_id from class_section_term -> class_sections
    await queryInterface.sequelize.query(`
      UPDATE students s
      JOIN class_section_term cst ON cst.class_section_term_id = s.class_section_term_id
      JOIN class_sections cs ON cs.class_sections_id = cst.class_sections_id
      SET s.batch_id = cs.batch_id
      WHERE cs.batch_id IS NOT NULL
    `);

    // 2. Fallback: Match batch_id by (session_id, batch_year) from batch table
    await queryInterface.sequelize.query(`
      UPDATE students s
      JOIN batch b ON b.session_id = s.session_id AND b.batch = s.batch_year
      SET s.batch_id = b.batch_id
      WHERE s.batch_id IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {},
};
