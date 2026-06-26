'use strict';

async function dropSemesterFk(queryInterface, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'class_sections'
      AND COLUMN_NAME = 'semester_id'
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

/** Term is stored on class.term / class.semester_id; class_sections no longer duplicate semester_id. */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('class_sections');
      if (!table.semester_id) {
        await transaction.commit();
        return;
      }

      await dropSemesterFk(queryInterface, transaction);
      await queryInterface.removeColumn('class_sections', 'semester_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('class_sections');
      if (table.semester_id) {
        await transaction.commit();
        return;
      }

      await queryInterface.addColumn(
        'class_sections',
        'semester_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'semester', key: 'semester_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE class_sections cs
        INNER JOIN class c ON c.class_id = cs.class_id
        SET cs.semester_id = c.semester_id
        WHERE cs.semester_id IS NULL
          AND c.semester_id IS NOT NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
