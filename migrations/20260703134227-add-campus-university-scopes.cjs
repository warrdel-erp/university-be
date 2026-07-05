'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if scopes table exists before trying to insert
    const tableExists = await queryInterface.describeTable('scopes').catch(() => null);
    if (tableExists) {
      await queryInterface.bulkInsert('scopes', [
        { scope_key: 'CAMPUS', created_at: new Date(), updated_at: new Date() },
        { scope_key: 'UNIVERSITY', created_at: new Date(), updated_at: new Date() }
      ], { ignoreDuplicates: true });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableExists = await queryInterface.describeTable('scopes').catch(() => null);
    if (tableExists) {
      await queryInterface.bulkDelete('scopes', {
        scope_key: ['CAMPUS', 'UNIVERSITY']
      });
    }
  }
};
