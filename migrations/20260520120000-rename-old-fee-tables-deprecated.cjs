'use strict';

/**
 * Legacy fee tables → *.__deprecated (replaced by fee v2).
 * Safe on fresh DB: skips rename if source table does not exist.
 * Run after 20260518100001–10008 and 20260520130000 on production merge.
 */

const RENAMES = [
  ['fee_group', 'fee_group__deprecated'],
  ['fee_type', 'fee_type__deprecated'],
  ['fee_plan', 'fee_plan__deprecated'],
  ['fee_new_invoice', 'fee_new_invoice__deprecated'],
  ['fee_plan_semester', 'fee_plan_semester__deprecated'],
  ['fee_plan_type', 'fee_plan_type__deprecated'],
  ['student_invoice_mapper', 'student_invoice_mapper__deprecated'],
  ['fee_type_group', 'fee_type_group__deprecated'],
  ['fee_invoice', 'fee_invoice__deprecated'],
  ['fee_invoice_details', 'fee_invoice_details__deprecated'],
  ['fee_invoice_detail_record', 'fee_invoice_detail_record__deprecated'],
];

async function tableNames(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => (typeof t === 'string' ? t : Object.values(t)[0]));
}

async function renameIfExists(queryInterface, from, to) {
  const names = await tableNames(queryInterface);
  if (names.includes(from) && !names.includes(to)) {
    await queryInterface.renameTable(from, to);
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const [from, to] of RENAMES) {
      await renameIfExists(queryInterface, from, to);
    }
  },

  async down(queryInterface) {
    for (const [from, to] of [...RENAMES].reverse()) {
      await renameIfExists(queryInterface, to, from);
    }
  },
};
