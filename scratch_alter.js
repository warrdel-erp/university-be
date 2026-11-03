import sequelize from './database/sequelizeConfig.js';

async function alterTable() {
  try {
    await sequelize.query(`
      ALTER TABLE billing_schedule_items 
      ADD COLUMN name VARCHAR(255) NULL COMMENT 'Optional custom name for this specific billing schedule' AFTER fee_plan_item_id;
    `);
    console.log("Column added successfully!");
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", error);
    }
  } finally {
    await sequelize.close();
  }
}

alterTable();
