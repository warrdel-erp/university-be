'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Drop foreign keys referencing batch_id
      await queryInterface.removeConstraint('class_sections', 'class_sections_batch_id_fk', { transaction: t }).catch(() => {});
      await queryInterface.removeConstraint('curriculum_batch_mapping', 'curriculum_batch_mapping_batch_id_fk', { transaction: t }).catch(() => {});
      await queryInterface.removeConstraint('students', 'students_batch_id_fk', { transaction: t }).catch(() => {});

      // 2. Change column to AUTO_INCREMENT
      await queryInterface.sequelize.query(
        'ALTER TABLE batch MODIFY batch_id INT NOT NULL AUTO_INCREMENT;',
        { transaction: t }
      );

      // 3. Add foreign keys back
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
  }
};
