'use strict';

/** attendance: term-scoped reports via class_section_term_id */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('attendance', { transaction });

      if (!table.class_section_term_id) {
        await queryInterface.addColumn(
          'attendance',
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
        UPDATE attendance a
        INNER JOIN class_schedule_item csi
          ON csi.time_table_mapping_id = a.time_table_mapping_id
        INNER JOIN time_table_routine ttr
          ON ttr.time_table_routine_id = csi.time_table_routine_id
        SET a.class_section_term_id = ttr.class_section_term_id
        WHERE a.class_section_term_id IS NULL
          AND ttr.class_section_term_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE attendance a
        INNER JOIN students s ON s.student_id = a.student_id
        SET a.class_section_term_id = s.class_section_term_id
        WHERE a.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE attendance a
        INNER JOIN class_section_term cst
          ON cst.class_sections_id = a.class_sections_id
        INNER JOIN students s
          ON s.student_id = a.student_id
         AND s.class_section_term_id = cst.class_section_term_id
        SET a.class_section_term_id = cst.class_section_term_id
        WHERE a.class_section_term_id IS NULL
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
      const table = await queryInterface.describeTable('attendance', { transaction });
      if (table.class_section_term_id) {
        await queryInterface.removeColumn('attendance', 'class_section_term_id', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
