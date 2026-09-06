'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

      try {
        await queryInterface.sequelize.query('ALTER TABLE assessment_evalution DROP FOREIGN KEY fk_assessment_evalution_assessment');
      } catch (e) {
        console.log("Foreign key fk_assessment_evalution_assessment might already be dropped.");
      }

      const tableDescription = await queryInterface.describeTable('internal_assessment');
      
      const columnsToDrop = [
        'type', 'total_marks', 'publish_date', 'due_date', 
        'description', 'file', 'created_by', 'updated_by', 'deleted_at'
      ];

      for (const col of columnsToDrop) {
        if (tableDescription[col]) {
          await queryInterface.sequelize.query(`ALTER TABLE internal_assessment DROP COLUMN ${col}`);
        }
      }

      if (tableDescription['exam_assessment_id']) {
        try {
          await queryInterface.sequelize.query('ALTER TABLE internal_assessment MODIFY exam_assessment_id INT NOT NULL');
          await queryInterface.sequelize.query('ALTER TABLE internal_assessment DROP PRIMARY KEY');
        } catch (e) {
          console.log("Primary key drop non-fatal error: ", e.message);
        }
        await queryInterface.sequelize.query('ALTER TABLE internal_assessment DROP COLUMN exam_assessment_id');
      }

      if (!tableDescription['internal_assessment_id']) {
        await queryInterface.addColumn('internal_assessment', 'internal_assessment_id', {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        });
      }

      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Empty down migration
  }
};
