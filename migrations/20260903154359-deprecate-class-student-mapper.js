'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Rename class_student_mapper to deprecated_class_student_mapper
    await queryInterface.renameTable('class_student_mapper', 'deprecated_class_student_mapper');
    
    // In fee_invoice and fee_invoice_details, we change class_student_mapper_id to allow null, 
    // since we'll stop inserting valid IDs for new records.
    await queryInterface.changeColumn('fee_invoice', 'class_student_mapper_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.changeColumn('fee_invoice_details', 'class_student_mapper_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('fee_invoice_details', 'class_student_mapper_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('fee_invoice', 'class_student_mapper_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.renameTable('deprecated_class_student_mapper', 'class_student_mapper');
  }
};
