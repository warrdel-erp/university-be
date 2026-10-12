'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Drop dependent tables in reverse order of their foreign key relationships
      // This allows us to drop the parent tables without disabling foreign key checks!
      
      // 1. fee_invoice_detail_record__deprecated depends on fee_invoice_details__deprecated & fee_invoice__deprecated
      await queryInterface.dropTable('fee_invoice_detail_record__deprecated', { transaction });
      
      // 2. fee_invoice_details__deprecated depends on fee_invoice__deprecated
      await queryInterface.dropTable('fee_invoice_details__deprecated', { transaction });
      
      // 3. fee_invoice__deprecated depends on class_student_mapper_depricated
      await queryInterface.dropTable('fee_invoice__deprecated', { transaction });
      
      // 4. Finally drop class_student_mapper_depricated
      await queryInterface.dropTable('class_student_mapper_depricated', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    console.log("Cannot revert dropping of deprecated tables");
  }
};
