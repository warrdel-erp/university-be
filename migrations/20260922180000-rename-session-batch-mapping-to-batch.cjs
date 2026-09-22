'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Drop foreign keys referencing the column
      await queryInterface.removeConstraint('class_sections', 'class_sections_session_batch_mapping_id_foreign_idx', { transaction: t }).catch(() => {});
      await queryInterface.removeConstraint('curriculum_batch_mapping', 'curriculum_batch_mapping_session_batch_mapping_id_foreign_idx', { transaction: t }).catch(() => {});
      // students table uses batch_id already, but we'll check if it has a constraint named students_batch_id_foreign_idx pointing to session_batch_mapping
      await queryInterface.removeConstraint('students', 'students_batch_id_foreign_idx', { transaction: t }).catch(() => {});

      // 2. Conditionally rename table if it hasn't been renamed yet
      const tableInfo = await queryInterface.showAllTables();
      if (tableInfo.includes('session_batch_mapping')) {
        await queryInterface.renameTable('session_batch_mapping', 'batch', { transaction: t });
      }

      // 3. Rename primary key column
      const batchCols = await queryInterface.describeTable('batch');
      if (batchCols['session_batch_mapping_id']) {
        await queryInterface.renameColumn('batch', 'session_batch_mapping_id', 'batch_id', { transaction: t });
      }

      // 4. Rename foreign key columns in other tables
      const classSectionCols = await queryInterface.describeTable('class_sections');
      if (classSectionCols['session_batch_mapping_id']) {
        await queryInterface.renameColumn('class_sections', 'session_batch_mapping_id', 'batch_id', { transaction: t });
      }
      
      const currBatchCols = await queryInterface.describeTable('curriculum_batch_mapping');
      if (currBatchCols['session_batch_mapping_id']) {
        await queryInterface.renameColumn('curriculum_batch_mapping', 'session_batch_mapping_id', 'batch_id', { transaction: t });
      }

      // 5. Add foreign keys back
      await queryInterface.addConstraint('class_sections', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'class_sections_batch_id_fk',
        references: { table: 'batch', field: 'batch_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      }).catch(e => console.log('constraint exists'));
      
      await queryInterface.addConstraint('curriculum_batch_mapping', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'curriculum_batch_mapping_batch_id_fk',
        references: { table: 'batch', field: 'batch_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      }).catch(e => console.log('constraint exists'));
      
      await queryInterface.addConstraint('students', {
        fields: ['batch_id'],
        type: 'foreign key',
        name: 'students_batch_id_fk',
        references: { table: 'batch', field: 'batch_id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction: t
      }).catch(e => console.log('constraint exists'));
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Implement rollback if needed
  }
};
