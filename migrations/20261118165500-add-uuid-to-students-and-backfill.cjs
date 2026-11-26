'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('students', { transaction });

      // 1. Add uuid column if not exists (nullable initially for safe backfill)
      if (!table.uuid) {
        await queryInterface.addColumn(
          'students',
          'uuid',
          {
            type: Sequelize.CHAR(36),
            allowNull: true,
            after: 'student_id',
          },
          { transaction }
        );
      }

      // 2. Backfill existing records with UUIDs
      const [rowsWithoutUuid] = await queryInterface.sequelize.query(
        `SELECT student_id FROM students WHERE uuid IS NULL OR uuid = '';`,
        { transaction }
      );

      if (rowsWithoutUuid && rowsWithoutUuid.length > 0) {
        console.log(`Backfilling UUID for ${rowsWithoutUuid.length} existing students...`);
        for (const row of rowsWithoutUuid) {
          await queryInterface.sequelize.query(
            `UPDATE students SET uuid = :newUuid WHERE student_id = :studentId;`,
            {
              replacements: {
                newUuid: uuidv4(),
                studentId: row.student_id,
              },
              transaction,
            }
          );
        }
      }

      // 3. Make column NOT NULL
      await queryInterface.changeColumn(
        'students',
        'uuid',
        {
          type: Sequelize.CHAR(36),
          allowNull: false,
        },
        { transaction }
      );

      // 4. Add unique index on uuid
      const indexes = await queryInterface.showIndex('students', { transaction });
      const hasUniqueIndex = indexes.some((idx) => idx.name === 'students_uuid_unique');
      if (!hasUniqueIndex) {
        await queryInterface.addIndex('students', ['uuid'], {
          unique: true,
          name: 'students_uuid_unique',
          transaction,
        });
      }

      await transaction.commit();
      console.log('Successfully added and backfilled uuid in students table.');
    } catch (error) {
      await transaction.rollback();
      console.error('Error migrating uuid in students table:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('students', { transaction });

      if (table.uuid) {
        const indexes = await queryInterface.showIndex('students', { transaction });
        const hasUniqueIndex = indexes.some((idx) => idx.name === 'students_uuid_unique');
        if (hasUniqueIndex) {
          await queryInterface.removeIndex('students', 'students_uuid_unique', { transaction });
        }
        await queryInterface.removeColumn('students', 'uuid', { transaction });
      }

      await transaction.commit();
      console.log('Successfully reverted uuid column from students table.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
