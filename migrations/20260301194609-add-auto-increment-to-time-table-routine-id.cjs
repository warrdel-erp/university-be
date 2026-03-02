'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const dbName = queryInterface.sequelize.config.database;
      // 1. Find all constraints referencing time_table_routine_id
      const [referencingConstraints] = await queryInterface.sequelize.query(
        `SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE REFERENCED_TABLE_NAME = 'time_table_routine' 
         AND REFERENCED_COLUMN_NAME = 'time_table_routine_id'
         AND TABLE_SCHEMA = '${dbName}'`,
        { transaction }
      );

      // 2. Drop them
      for (const constraint of referencingConstraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`,
          { transaction }
        );
      }

      // 3. Alter the column to add AUTO_INCREMENT
      await queryInterface.sequelize.query(
        'ALTER TABLE time_table_routine MODIFY time_table_routine_id INT NOT NULL AUTO_INCREMENT;',
        { transaction }
      );

      // 4. Restore constraints
      for (const constraint of referencingConstraints) {
        await queryInterface.addConstraint(constraint.TABLE_NAME, {
          fields: [constraint.COLUMN_NAME],
          type: 'foreign key',
          name: constraint.CONSTRAINT_NAME,
          references: {
            table: 'time_table_routine',
            field: 'time_table_routine_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          transaction
        });
      }
      await transaction.commit();
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const dbName = queryInterface.sequelize.config.database;
      // 1. Find all constraints referencing time_table_routine_id
      const [referencingConstraints] = await queryInterface.sequelize.query(
        `SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE REFERENCED_TABLE_NAME = 'time_table_routine' 
         AND REFERENCED_COLUMN_NAME = 'time_table_routine_id'
         AND TABLE_SCHEMA = '${dbName}'`,
        { transaction }
      );

      // 2. Drop them
      for (const constraint of referencingConstraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`,
          { transaction }
        );
      }

      // 3. Alter the column to remove AUTO_INCREMENT
      await queryInterface.sequelize.query(
        'ALTER TABLE time_table_routine MODIFY time_table_routine_id INT NOT NULL;',
        { transaction }
      );

      // 4. Restore constraints
      for (const constraint of referencingConstraints) {
        await queryInterface.addConstraint(constraint.TABLE_NAME, {
          fields: [constraint.COLUMN_NAME],
          type: 'foreign key',
          name: constraint.CONSTRAINT_NAME,
          references: {
            table: 'time_table_routine',
            field: 'time_table_routine_id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          transaction
        });
      }
      await transaction.commit();
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw err;
    }
  }
};
