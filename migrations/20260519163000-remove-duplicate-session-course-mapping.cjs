'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Delete duplicate entries, keeping only the oldest one (lowest id)
    // We use a self-join to delete rows that have a greater id than another row with the same course_id and session_id.
    await queryInterface.sequelize.query(`
      DELETE t1 FROM session_course_mapping t1
      INNER JOIN session_course_mapping t2 
      WHERE t1.session_course_mapping_id > t2.session_course_mapping_id 
        AND t1.course_id = t2.course_id 
        AND t1.session_id = t2.session_id;
    `);

    // 2. Add a unique constraint so no duplicate entries can be created in the future
    try {
      await queryInterface.addConstraint('session_course_mapping', {
        fields: ['course_id', 'session_id'],
        type: 'unique',
        name: 'unique_course_session_mapping'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique constraint in case of rollback
    await queryInterface.removeConstraint('session_course_mapping', 'unique_course_session_mapping');
    
    // Note: The deleted duplicate records cannot be restored automatically in the down migration.
  }
};
