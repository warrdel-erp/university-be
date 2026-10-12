'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tableDescription = await queryInterface.describeTable('fee_type_categories');

      if (tableDescription.institute_id) {
        // Drop foreign key constraints on institute_id if any exist
        const [fks] = await queryInterface.sequelize.query(
          `SELECT CONSTRAINT_NAME
           FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'fee_type_categories'
             AND COLUMN_NAME = 'institute_id'
             AND REFERENCED_TABLE_NAME IS NOT NULL`,
          { transaction }
        );

        for (const fk of fks) {
          try {
            await queryInterface.removeConstraint('fee_type_categories', fk.CONSTRAINT_NAME, { transaction });
          } catch (err) {
            // Ignore if constraint already dropped
          }
        }

        await queryInterface.removeColumn('fee_type_categories', 'institute_id', { transaction });
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tableDescription = await queryInterface.describeTable('fee_type_categories');

      if (!tableDescription.institute_id) {
        await queryInterface.addColumn(
          'fee_type_categories',
          'institute_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'institute', key: 'institute_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          { transaction }
        );
      }
    });
  },
};
