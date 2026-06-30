'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const historyTable = await queryInterface.describeTable('student_class_sections_history');
      if (!historyTable.class_section_term_id) {
        await queryInterface.addColumn(
          'student_class_sections_history',
          'class_section_term_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'class_section_term', key: 'class_section_term_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      const routineTable = await queryInterface.describeTable('time_table_routine');
      if (!routineTable.class_section_term_id) {
        await queryInterface.addColumn(
          'time_table_routine',
          'class_section_term_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'class_section_term', key: 'class_section_term_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
        UPDATE student_class_sections_history h
        INNER JOIN students s ON s.student_id = h.student_id
        SET h.class_section_term_id = s.class_section_term_id
        WHERE h.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
          AND h.status = 'current'
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE time_table_routine r
        INNER JOIN (
          SELECT class_sections_id, MIN(class_section_term_id) AS class_section_term_id
          FROM class_section_term
          GROUP BY class_sections_id
        ) cst ON cst.class_sections_id = r.class_sections_id
        SET r.class_section_term_id = cst.class_section_term_id
        WHERE r.class_section_term_id IS NULL
          AND r.class_sections_id IS NOT NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const historyTable = await queryInterface.describeTable('student_class_sections_history');
      if (historyTable.class_section_term_id) {
        await queryInterface.removeColumn('student_class_sections_history', 'class_section_term_id', { transaction });
      }

      const routineTable = await queryInterface.describeTable('time_table_routine');
      if (routineTable.class_section_term_id) {
        await queryInterface.removeColumn('time_table_routine', 'class_section_term_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
