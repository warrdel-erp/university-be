'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`SET SESSION sql_mode = ''`);
    
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: referenceModel,
            key: referenceKey
          }
        });
      }
    };

    // Add missing columns
    await addColumnIfNotExists('amc_contract', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('amc_service_ticket', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('amc_vendor_address', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('amc_vendor_address', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('amc_vendor', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('class_student_mapper', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_group__deprecated', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_plan_item', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_plan_profile', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_plan_semester__deprecated', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_plan_semester__deprecated', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('fee_plan_sub_items', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_type_catalog', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('fee_type_categories', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('library_book_category_mappings', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('library_book_subject_mappings', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('library_category', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('library_creation', 'university_id', 'university', 'university_id');

    // BACKFILL QUERIES

    await queryInterface.sequelize.query(`
      UPDATE amc_contract t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE amc_service_ticket t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE amc_vendor t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    // Backfill amc_vendor_address from amc_vendor
    await queryInterface.sequelize.query(`
      UPDATE amc_vendor_address t JOIN amc_vendor v ON t.amc_vendor_id = v.amc_vendor_id SET t.institute_id = v.institute_id, t.university_id = v.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE class_student_mapper t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_group__deprecated t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_plan_item t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_plan_profile t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_plan_sub_items t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_type_catalog t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE fee_type_categories t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_book_category_mappings t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_book_subject_mappings t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_category t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE library_creation t JOIN institute i ON t.institute_id = i.institute_id SET t.university_id = i.university_id
    `);

    // fee_plan_semester
    await queryInterface.sequelize.query(`
      UPDATE fee_plan_semester__deprecated s 
      JOIN fee_new_invoice__deprecated n ON s.fee_new_invoice_id = n.fee_new_invoice_id 
      JOIN fee_plan__deprecated p ON n.fee_plan_id = p.fee_plan_id 
      SET s.university_id = p.university_id, s.institute_id = p.institute_id
    `);

  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('amc_contract', 'university_id');
    await removeColumnIfExists('amc_service_ticket', 'university_id');
    await removeColumnIfExists('amc_vendor_address', 'university_id');
    await removeColumnIfExists('amc_vendor_address', 'institute_id');
    await removeColumnIfExists('amc_vendor', 'university_id');
    await removeColumnIfExists('class_student_mapper', 'university_id');
    await removeColumnIfExists('fee_group__deprecated', 'university_id');
    await removeColumnIfExists('fee_plan_item', 'university_id');
    await removeColumnIfExists('fee_plan_profile', 'university_id');
    await removeColumnIfExists('fee_plan_semester__deprecated', 'university_id');
    await removeColumnIfExists('fee_plan_semester__deprecated', 'institute_id');
    await removeColumnIfExists('fee_plan_sub_items', 'university_id');
    await removeColumnIfExists('fee_type_catalog', 'university_id');
    await removeColumnIfExists('fee_type_categories', 'university_id');
    await removeColumnIfExists('library_book_category_mappings', 'university_id');
    await removeColumnIfExists('library_book_subject_mappings', 'university_id');
    await removeColumnIfExists('library_category', 'university_id');
    await removeColumnIfExists('library_creation', 'university_id');
  }
};
