'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Remove older duplicate mappings for the same batch, keeping only the latest mapping (highest ID)
      await queryInterface.sequelize.query(`
        DELETE t1 FROM academic_regulation_course_mapping t1
        INNER JOIN academic_regulation_course_mapping t2
          ON t1.batch_id = t2.batch_id
         AND t1.academic_regulation_course_mapping_id < t2.academic_regulation_course_mapping_id;
      `, { transaction });

      // 2. Check and add unique constraint on batch_id
      const indexes = await queryInterface.showIndex('academic_regulation_course_mapping', { transaction });
      const hasUniqueOnBatch = indexes.some((idx) => idx.name === 'uq_academic_regulation_batch_id');

      if (!hasUniqueOnBatch) {
        await queryInterface.addIndex('academic_regulation_course_mapping', ['batch_id'], {
          unique: true,
          name: 'uq_academic_regulation_batch_id',
          transaction,
        });
      }

      await transaction.commit();
      console.log('Successfully deduplicated academic_regulation_course_mapping and added unique constraint on batch_id.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const indexes = await queryInterface.showIndex('academic_regulation_course_mapping', { transaction });
      const hasUniqueOnBatch = indexes.some((idx) => idx.name === 'uq_academic_regulation_batch_id');

      if (hasUniqueOnBatch) {
        await queryInterface.removeIndex('academic_regulation_course_mapping', 'uq_academic_regulation_batch_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

