'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Drop foreign key on academic_regulation for batch_id if exists
      const [regFks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'academic_regulation'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'batch_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of regFks) {
        try {
          await queryInterface.removeConstraint('academic_regulation', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint on academic_regulation.batch_id: ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      // 2. Drop batch_id column from academic_regulation
      const regTableDesc = await queryInterface.describeTable('academic_regulation', { transaction }).catch(() => ({}));
      if (regTableDesc.batch_id) {
        await queryInterface.removeColumn('academic_regulation', 'batch_id', { transaction });
        console.log('Dropped column batch_id from academic_regulation');
      }

      await transaction.commit();
      console.log('Batch ID removal from academic_regulation completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const regTableDesc = await queryInterface.describeTable('academic_regulation', { transaction }).catch(() => ({}));
      if (!regTableDesc.batch_id) {
        await queryInterface.addColumn('academic_regulation', 'batch_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'batch',
            key: 'batch_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
