'use strict';

/** subject_mapper: link student-subject rows via class_section_term_id */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const { sequelize } = queryInterface;

    try {
      const subjectMapperTable = await queryInterface.describeTable('subject_mapper', { transaction });

      if (subjectMapperTable.deleted_at) {
        await sequelize.query(
          'ALTER TABLE `subject_mapper` MODIFY COLUMN `deleted_at` TIMESTAMP NULL DEFAULT NULL',
          { transaction },
        );
      }

      if (!subjectMapperTable.class_section_term_id) {
        await queryInterface.addColumn(
          'subject_mapper',
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

      await sequelize.query(
        `
        UPDATE subject_mapper sm
        INNER JOIN students s ON s.student_id = sm.student_id
        SET sm.class_section_term_id = s.class_section_term_id
        WHERE sm.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
        `,
        { transaction },
      );

      await sequelize.query(
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
        await queryInterface.removeColumn('subject_mapper', 'term', { transaction });
      }

      if (table.semester_id) {
        const [constraints] = await sequelize.query(
          `
          SELECT CONSTRAINT_NAME AS constraintName
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'subject_mapper'
            AND COLUMN_NAME = 'semester_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
          `,
          { transaction },
        );

        for (const row of constraints) {
          await sequelize.query(
            `ALTER TABLE \`subject_mapper\` DROP FOREIGN KEY \`${row.constraintName}\``,
            { transaction },
          );
        }

        await queryInterface.removeColumn('subject_mapper', 'semester_id', { transaction });
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
      const table = await queryInterface.describeTable('subject_mapper', { transaction });

      if (!table.semester_id) {
        await queryInterface.addColumn(
          'subject_mapper',
          'semester_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (table.class_section_term_id) {
        await queryInterface.removeColumn('subject_mapper', 'class_section_term_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
