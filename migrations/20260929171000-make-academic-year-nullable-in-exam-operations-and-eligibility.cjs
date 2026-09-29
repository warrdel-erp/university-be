'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableColumnMap = [
        { table: 'exam_invigilator_assignment', column: 'acedmic_year_id' },
        { table: 'exam_room_material_bundle', column: 'academic_year_id' },
        { table: 'exam_attendance', column: 'academic_year_id' },
        { table: 'examination_session_eligibility', column: 'acedmic_year_id' },
        { table: 'student_hall_ticket', column: 'acedmic_year_id' },
      ];

      for (const { table, column } of tableColumnMap) {
        const tableDesc = await queryInterface.describeTable(table, { transaction }).catch(() => ({}));
        if (tableDesc && tableDesc[column]) {
          await queryInterface.changeColumn(
            table,
            column,
            {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            { transaction }
          );
          console.log(`Changed ${table}.${column} to allowNull: true`);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableColumnMap = [
        { table: 'exam_invigilator_assignment', column: 'acedmic_year_id' },
        { table: 'exam_room_material_bundle', column: 'academic_year_id' },
        { table: 'exam_attendance', column: 'academic_year_id' },
        { table: 'examination_session_eligibility', column: 'acedmic_year_id' },
        { table: 'student_hall_ticket', column: 'acedmic_year_id' },
      ];

      for (const { table, column } of tableColumnMap) {
        const tableDesc = await queryInterface.describeTable(table, { transaction }).catch(() => ({}));
        if (tableDesc && tableDesc[column]) {
          await queryInterface.changeColumn(
            table,
            column,
            {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
