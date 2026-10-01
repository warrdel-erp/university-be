'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex('subject', { transaction });
      const hasConstraint = indexes.some(
        (idx) => idx.name === 'unique_subject_code_constraint',
      );

      if (hasConstraint) {
        await queryInterface.removeIndex(
          'subject',
          'unique_subject_code_constraint',
          { transaction },
        );
      } else {
        const [results] = await queryInterface.sequelize.query(
          `SELECT CONSTRAINT_NAME 
           FROM information_schema.TABLE_CONSTRAINTS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'subject' 
             AND CONSTRAINT_NAME = 'unique_subject_code_constraint'`,
          { transaction },
        );

        if (results && results.length > 0) {
          await queryInterface.sequelize.query(
            'ALTER TABLE `subject` DROP INDEX `unique_subject_code_constraint`',
            { transaction },
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const indexes = await queryInterface.showIndex('subject', { transaction });
      const hasConstraint = indexes.some(
        (idx) => idx.name === 'unique_subject_code_constraint',
      );

      if (!hasConstraint) {
        await queryInterface.addIndex('subject', ['subject_code'], {
          name: 'unique_subject_code_constraint',
          unique: true,
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
