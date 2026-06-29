'use strict';

async function dropForeignKey(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName }, transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function removeSemesterColumn(queryInterface, tableName, transaction) {
  const table = await queryInterface.describeTable(tableName);
  if (table.semester_id) {
    await dropForeignKey(queryInterface, tableName, 'semester_id', transaction);
    await queryInterface.removeColumn(tableName, 'semester_id', { transaction });
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const studentsTable = await queryInterface.describeTable('students');
      if (!studentsTable.class_section_term_id) {
        await queryInterface.addColumn(
          'students',
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

      const mapperTable = await queryInterface.describeTable('class_student_mapper');
      if (!mapperTable.class_section_term_id) {
        await queryInterface.addColumn(
          'class_student_mapper',
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

      for (const tableName of ['exam_schedule', 'internal_assessment', 'syllabus_unit']) {
        const table = await queryInterface.describeTable(tableName);
        if (!table.term) {
          await queryInterface.addColumn(
            tableName,
            'term',
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              comment: 'Program term number (replaces semester_id)',
            },
            { transaction },
          );
        }
      }

      await queryInterface.sequelize.query(
        `
        UPDATE students s
        INNER JOIN semester sem ON sem.semester_id = s.semester_id
        INNER JOIN class_section_term cst
          ON cst.class_sections_id = s.class_sections_id
         AND cst.term = CAST(REGEXP_REPLACE(sem.name, '[^0-9]', '') AS UNSIGNED)
        SET s.class_section_term_id = cst.class_section_term_id
        WHERE s.class_section_term_id IS NULL
          AND s.class_sections_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE students s
        INNER JOIN (
          SELECT class_sections_id, MIN(class_section_term_id) AS class_section_term_id
          FROM class_section_term
          WHERE deleted_at IS NULL
          GROUP BY class_sections_id
        ) cst ON cst.class_sections_id = s.class_sections_id
        SET s.class_section_term_id = cst.class_section_term_id
        WHERE s.class_section_term_id IS NULL
          AND s.class_sections_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class_student_mapper csm
        INNER JOIN students s ON s.student_id = csm.student_id
        SET csm.class_section_term_id = s.class_section_term_id
        WHERE csm.class_section_term_id IS NULL
          AND s.class_section_term_id IS NOT NULL
        `,
        { transaction },
      );

      for (const tableName of ['exam_schedule', 'internal_assessment', 'syllabus_unit']) {
        await queryInterface.sequelize.query(
          `
          UPDATE \`${tableName}\` t
          INNER JOIN semester sem ON sem.semester_id = t.semester_id
          SET t.term = CAST(REGEXP_REPLACE(sem.name, '[^0-9]', '') AS UNSIGNED)
          WHERE t.term IS NULL
            AND t.semester_id IS NOT NULL
          `,
          { transaction },
        );
      }

      await removeSemesterColumn(queryInterface, 'students', transaction);
      await removeSemesterColumn(queryInterface, 'class_student_mapper', transaction);
      await removeSemesterColumn(queryInterface, 'class_subject_mapper', transaction);
      await removeSemesterColumn(queryInterface, 'exam_schedule', transaction);
      await removeSemesterColumn(queryInterface, 'internal_assessment', transaction);
      await removeSemesterColumn(queryInterface, 'syllabus_unit', transaction);

      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.includes('semester') && !tables.includes('semester_deprecated')) {
        await queryInterface.renameTable('semester', 'semester_deprecated', { transaction });
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
      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.includes('semester_deprecated') && !tables.includes('semester')) {
        await queryInterface.renameTable('semester_deprecated', 'semester', { transaction });
      }

      const studentsTable = await queryInterface.describeTable('students');
      if (studentsTable.class_section_term_id) {
        await dropForeignKey(queryInterface, 'students', 'class_section_term_id', transaction);
        await queryInterface.removeColumn('students', 'class_section_term_id', { transaction });
      }

      const mapperTable = await queryInterface.describeTable('class_student_mapper');
      if (mapperTable.class_section_term_id) {
        await dropForeignKey(queryInterface, 'class_student_mapper', 'class_section_term_id', transaction);
        await queryInterface.removeColumn('class_student_mapper', 'class_section_term_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
