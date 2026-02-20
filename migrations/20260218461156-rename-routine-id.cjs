'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Find all tables and constraints that reference time_table_routine(time_table_create_id)
      const [referencingConstraints] = await queryInterface.sequelize.query(
        `SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            CONSTRAINT_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE REFERENCED_TABLE_NAME = 'time_table_routine' 
         AND REFERENCED_COLUMN_NAME = 'time_table_create_id'
         AND TABLE_SCHEMA = DATABASE()`,
        { transaction }
      );

      // 2. Drop all those foreign keys
      for (const constraint of referencingConstraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`,
          { transaction }
        );
      }

      // 3. Rename the Primary Key in the parent table
      await queryInterface.renameColumn('time_table_routine', 'time_table_create_id', 'time_table_routine_id', { transaction });

      // 4. Handle the column in class_schedule_item specifically
      // Check its current name first to avoid errors if it's already renamed
      const [columns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM class_schedule_item LIKE 'time_table_create_id'`,
        { transaction }
      );

      if (columns.length > 0) {
        await queryInterface.renameColumn('class_schedule_item', 'time_table_create_id', 'time_table_routine_id', { transaction });
      }

      // 5. Re-add all constraints that were dropped, now pointing to the new column name
      for (const constraint of referencingConstraints) {
        // We determine the local column name to use (it might have been renamed to time_table_routine_id)
        const localColumn = (constraint.TABLE_NAME === 'class_schedule_item') ? 'time_table_routine_id' : constraint.COLUMN_NAME;

        await queryInterface.addConstraint(constraint.TABLE_NAME, {
          fields: [localColumn],
          type: 'foreign key',
          name: constraint.CONSTRAINT_NAME, // Keep same name or let it auto-generate
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
      // 1. Find all constraints referencing the NEW column name
      const [referencingConstraints] = await queryInterface.sequelize.query(
        `SELECT 
            TABLE_NAME, 
            COLUMN_NAME, 
            CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE REFERENCED_TABLE_NAME = 'time_table_routine' 
         AND REFERENCED_COLUMN_NAME = 'time_table_routine_id'
         AND TABLE_SCHEMA = DATABASE()`,
        { transaction }
      );

      // 2. Drop them
      for (const constraint of referencingConstraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${constraint.TABLE_NAME} DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`,
          { transaction }
        );
      }

      // 3. Rename back
      await queryInterface.renameColumn('time_table_routine', 'time_table_routine_id', 'time_table_create_id', { transaction });

      const [columns] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM class_schedule_item LIKE 'time_table_routine_id'`,
        { transaction }
      );
      if (columns.length > 0) {
        await queryInterface.renameColumn('class_schedule_item', 'time_table_routine_id', 'time_table_create_id', { transaction });
      }

      // 4. Restore constraints
      for (const constraint of referencingConstraints) {
        const localColumn = (constraint.TABLE_NAME === 'class_schedule_item') ? 'time_table_create_id' : constraint.COLUMN_NAME;
        await queryInterface.addConstraint(constraint.TABLE_NAME, {
          fields: [localColumn],
          type: 'foreign key',
          name: constraint.CONSTRAINT_NAME,
          references: {
            table: 'time_table_routine',
            field: 'time_table_create_id'
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



