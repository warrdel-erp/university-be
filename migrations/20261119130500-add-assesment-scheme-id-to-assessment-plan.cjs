'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('assessment_plan');

    if (!tableInfo.academic_regulation_assesment_scheme_id) {
      // 1. Add column without automatic FK constraint first
      await queryInterface.addColumn('assessment_plan', 'academic_regulation_assesment_scheme_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      // 2. Add FK constraint with explicit short name (<= 64 chars)
      await queryInterface.addConstraint('assessment_plan', {
        fields: ['academic_regulation_assesment_scheme_id'],
        type: 'foreign key',
        name: 'fk_ap_ar_assesment_scheme_id',
        references: {
          table: 'academic_regulation_assesment_scheme',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // 3. Add explicit short index
      await queryInterface.addIndex('assessment_plan', ['academic_regulation_assesment_scheme_id'], {
        name: 'idx_ap_ar_assesment_scheme_id',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('assessment_plan');
    if (tableInfo.academic_regulation_assesment_scheme_id) {
      await queryInterface.removeConstraint('assessment_plan', 'fk_ap_ar_assesment_scheme_id').catch(() => {});
      await queryInterface.removeIndex('assessment_plan', 'idx_ap_ar_assesment_scheme_id').catch(() => {});
      await queryInterface.removeColumn('assessment_plan', 'academic_regulation_assesment_scheme_id');
    }
  }
};
