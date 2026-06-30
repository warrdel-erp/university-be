'use strict';

const { addColumnSafe, removeColumnSafe, normalizeParanoidDeletedAt } = require('./helpers/sqlModeHelpers.cjs');

/** subject_mapper: link student-subject rows via class_section_term_id */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await normalizeParanoidDeletedAt(queryInterface, 'subject_mapper', transaction);

      await addColumnSafe(
        queryInterface,
        'subject_mapper',
        'class_section_term_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'class_section_term', key: 'class_section_term_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        transaction,
      );

      await queryInterface.sequelize.query(
        `
        UPDATE subject_mapper sm
        INNER JOIN students s ON s.student_id = sm.student_id
        SET sm.class_section_term_id = s.class_section_term_id
        WHERE sm.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE subject_mapper sm
        INNER JOIN students s ON s.student_id = sm.student_id
        INNER JOIN class_section_term student_cst
          ON student_cst.class_section_term_id = s.class_section_term_id
        INNER JOIN subject sub ON sub.subject_id = sm.subject_id
        INNER JOIN class_section_term cst
          ON cst.class_sections_id = student_cst.class_sections_id
         AND cst.term = sub.term
        SET sm.class_section_term_id = cst.class_section_term_id
        WHERE sm.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
          AND sub.term IS NOT NULL
        `,
        { transaction },
      );

      const table = await queryInterface.describeTable('subject_mapper', { transaction });

      if (table.term) {
        await removeColumnSafe(queryInterface, 'subject_mapper', 'term', transaction);
      }

      if (table.semester_id) {
        await removeColumnSafe(queryInterface, 'subject_mapper', 'semester_id', transaction);
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
      await addColumnSafe(
        queryInterface,
        'subject_mapper',
        'semester_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      );

      await removeColumnSafe(queryInterface, 'subject_mapper', 'class_section_term_id', transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
