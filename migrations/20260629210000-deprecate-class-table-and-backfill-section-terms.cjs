'use strict';

async function dropClassSectionsClassFk(queryInterface, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'class_sections'
      AND COLUMN_NAME = 'class_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE class_sections DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tables = await queryInterface.showAllTables({ transaction });
      const hasClass = tables.includes('class');
      const hasDeprecated = tables.includes('class_deprecated');

      if (hasClass) {
        await queryInterface.sequelize.query(
          `
          UPDATE class_sections cs
          INNER JOIN class c ON c.class_id = cs.class_id
          INNER JOIN course co ON co.course_id = cs.course_id
          SET cs.year = COALESCE(
            cs.year,
            CEILING(
              c.term / GREATEST(co.total_terms / NULLIF(co.course_duration, 0), 1)
            )
          )
          WHERE cs.year IS NULL
            AND c.term IS NOT NULL
          `,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          UPDATE class_sections cs
          INNER JOIN class c ON c.class_id = cs.class_id
          SET cs.year = COALESCE(cs.year, c.term)
          WHERE cs.year IS NULL
            AND c.term IS NOT NULL
          `,
          { transaction },
        );
      }

      if (tables.includes('class_section_term') && hasClass) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO class_section_term (
            class_sections_id,
            term,
            university_id,
            institute_id,
            created_by,
            created_at,
            updated_at
          )
          SELECT
            cs.class_sections_id,
            c.term,
            co.university_id,
            COALESCE(cs.institute_id, co.institute_id),
            cs.created_by,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          FROM class_sections cs
          INNER JOIN class c ON c.class_id = cs.class_id
          INNER JOIN course co ON co.course_id = cs.course_id
          WHERE c.term IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM class_section_term cst
              WHERE cst.class_sections_id = cs.class_sections_id
                AND cst.term = c.term
                AND cst.deleted_at IS NULL
            )
          `,
          { transaction },
        );
      }

      const classSectionsTable = await queryInterface.describeTable('class_sections');
      if (classSectionsTable.class_id) {
        await dropClassSectionsClassFk(queryInterface, transaction);
        await queryInterface.removeColumn('class_sections', 'class_id', { transaction });
      }

      if (hasClass && !hasDeprecated) {
        await queryInterface.renameTable('class', 'class_deprecated', { transaction });
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
      if (tables.includes('class_deprecated') && !tables.includes('class')) {
        await queryInterface.renameTable('class_deprecated', 'class', { transaction });
      }

      const classSectionsTable = await queryInterface.describeTable('class_sections');
      if (!classSectionsTable.class_id) {
        await queryInterface.addColumn(
          'class_sections',
          'class_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'class', key: 'class_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
