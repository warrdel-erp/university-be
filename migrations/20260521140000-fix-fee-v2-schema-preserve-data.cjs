'use strict';

/**
 * Same as 20260521130000 after it was changed to non-destructive.
 * Runs on DBs that already executed the old destructive version of 213000.
 * Safe to run multiple times — only adds missing tables/columns.
 */

const repair = require('./20260521130000-recreate-fee-v2-tables.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await repair.up(queryInterface, Sequelize);
  },

  async down() {},
};
