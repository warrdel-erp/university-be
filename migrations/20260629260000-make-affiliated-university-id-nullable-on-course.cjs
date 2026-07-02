'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = 'course';
      const column = 'affiliated_university_id';

      const [constraints] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME AS constraintName
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
        { replacements: { table, column }, transaction },
      );

      for (const row of constraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.constraintName}\``,
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY \`${column}\` INT NULL`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE \`${table}\`
        ADD CONSTRAINT \`fk_course_affiliated_university_id\`
        FOREIGN KEY (\`${column}\`) REFERENCES affiliated_university (affiliated_university_id)
        ON DELETE SET NULL ON UPDATE CASCADE
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
      const table = 'course';
      const column = 'affiliated_university_id';

      const [[nullRow]] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS nullCount
        FROM \`${table}\`
        WHERE \`${column}\` IS NULL
        `,
        { transaction },
      );
      if (Number(nullRow.nullCount) > 0) {
        throw new Error(
          `Cannot revert: ${nullRow.nullCount} course row(s) still have null ${column}`,
        );
      }

      const [constraints] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME AS constraintName
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :column
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
        { replacements: { table, column }, transaction },
      );

      for (const row of constraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${row.constraintName}\``,
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY \`${column}\` INT NOT NULL`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE \`${table}\`
        ADD CONSTRAINT \`fk_course_affiliated_university_id\`
        FOREIGN KEY (\`${column}\`) REFERENCES affiliated_university (affiliated_university_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
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
