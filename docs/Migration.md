# 🚀 Migration Documentation

-------------------------------------------------------------------
## 📋 Table of Contents
1. Introduction to Migrations
2. How Migration Files Work
3. Required Configuration Files
4. Migration Commands
5. Creating a Migration
6. Migration Operations (Full Examples)
7. Important
-------------------------------------------------------------------

## 📘 1. Introduction to Migrations

Migrations are version-controlled database schema updates.

Each migration represents ONE change:
- Create table
- Add/remove column
- Add/remove foreign key
- Change datatype
- Add/remove index

Benefits:
- Schema history
- Safe rollback
- Same DB structure across all environments
- No manual SQL required

-------------------------------------------------------------------

## 🧩 2. How Migration Files Work

A migration file contains two functions:

✔ up()   → Apply schema change  
✔ down() → Revert schema change  

Structure:
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // apply change
  },

  down: async (queryInterface, Sequelize) => {
    // revert change
  }
};

-------------------------------------------------------------------

## 🗂️ 3. Required Configuration Files

Your project uses ES Modules ("type": "module"),  
but Sequelize CLI requires CommonJS (.cjs).

-------------------------------------------------------------------
### ✔ .sequelizerc
const path = require("path");

module.exports = {
  "config": path.resolve("database", "config.cjs"),
  "models-path": path.resolve("models"),
  "seeders-path": path.resolve("seeders"),
  "migrations-path": path.resolve("migrations")
};
-------------------------------------------------------------------

### ✔ database/config.cjs
require("dotenv").config();

module.exports = {
  development: {
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE_NAME,
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false
  }
};
-------------------------------------------------------------------

### ✔ Folder Structure

/migrations      ← migration files  
/seeders         ← seeder files  
/database        ← config.cjs  

-------------------------------------------------------------------

## 🛠️ 4. Migration Commands (package.json)

"scripts": {
  "migrate": "npx sequelize-cli db:migrate --env development",
  "migrate:status": "npx sequelize-cli db:migrate:status --env development",
  "migrate:undo": "npx sequelize-cli db:migrate:undo --env development",
  "migrate:undo:all": "npx sequelize-cli db:migrate:undo:all --env development"
}

Run migrations:
npm run migrate

Check status:
npm run migrate:status

Undo last migration:
npm run migrate:undo

Undo all:
npm run migrate:undo:all

-------------------------------------------------------------------

## 📝 5. Creating a Migration

Generate migration:
npx sequelize-cli migration:generate --name add-new-column {STUDENT}
npm run mg -- --name {STUDENT}


Rename file to .cjs:
migrations/20251212120000-add-new-column.cjs

Add migration code inside.

-------------------------------------------------------------------

# 🧱 6. Migration Operations (Full Examples)

-------------------------------------------------------------------
## 6.1 Create Table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("students", {
      student_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: Sequelize.STRING,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("students");
  }
};
-------------------------------------------------------------------

## 6.2 Drop Table
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable("students");
  },

  down: async (queryInterface, Sequelize) => {
    // recreate table here if needed
  }
};
-------------------------------------------------------------------

## 6.3 Add Column
module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn("jobs", "priority_level", {
      type: Sequelize.INTEGER,
      allowNull: true
    }),

  down: (queryInterface) =>
    queryInterface.removeColumn("jobs", "priority_level")
};
-------------------------------------------------------------------

## 6.4 Remove Column
module.exports = {
  up: (queryInterface) =>
    queryInterface.removeColumn("jobs", "priority_level"),

  down: (queryInterface, Sequelize) =>
    queryInterface.addColumn("jobs", "priority_level", {
      type: Sequelize.INTEGER
    })
};
-------------------------------------------------------------------

## 6.5 Rename Column
module.exports = {
  up: (queryInterface) =>
    queryInterface.renameColumn("jobs", "job_title", "title"),

  down: (queryInterface) =>
    queryInterface.renameColumn("jobs", "title", "job_title")
};
-------------------------------------------------------------------

## 6.6 Change Datatype
module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.changeColumn("jobs", "notes", {
      type: Sequelize.TEXT,
      allowNull: true
    }),

  down: (queryInterface, Sequelize) =>
    queryInterface.changeColumn("jobs", "notes", {
      type: Sequelize.STRING
    })
};
-------------------------------------------------------------------

## 6.7 Add NOT NULL
up: (queryInterface, Sequelize) =>
  queryInterface.changeColumn("jobs", "job_title", {
    type: Sequelize.STRING,
    allowNull: false
  });

-------------------------------------------------------------------

## 6.8 Remove NOT NULL
up: (queryInterface, Sequelize) =>
  queryInterface.changeColumn("jobs", "job_title", {
    type: Sequelize.STRING,
    allowNull: true
  });

-------------------------------------------------------------------

## 6.9 Add Default Value
up: (queryInterface, Sequelize) =>
  queryInterface.changeColumn("jobs", "status", {
    type: Sequelize.STRING,
    defaultValue: "Active"
  });

-------------------------------------------------------------------

## 6.10 Add Foreign Key
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("jobs", "subject_id", {
      type: Sequelize.INTEGER,
      references: {
        model: "subjects",
        key: "subject_id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  }
};
-------------------------------------------------------------------

## 6.11 Drop Foreign Key
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeConstraint("jobs", "jobs_subject_id_fkey");
    await queryInterface.removeColumn("jobs", "subject_id");
  }
};

Find FK name:
SHOW CREATE TABLE jobs;

-------------------------------------------------------------------

## 6.12 Add Index
module.exports = {
  up: (queryInterface) =>
    queryInterface.addIndex("jobs", ["employee_id", "job_date"]),

  down: (queryInterface) =>
    queryInterface.removeIndex("jobs", ["employee_id", "job_date"])
};
-------------------------------------------------------------------

## 6.13 Drop Index
module.exports = {
  up: (queryInterface) =>
    queryInterface.removeIndex("jobs", "jobs_employee_id_job_date")
};
-------------------------------------------------------------------

## 6.14 Rename Table
up: (queryInterface) =>
  queryInterface.renameTable("jobs", "faculty_jobs");

-------------------------------------------------------------------

## 6.15 Add Soft Delete Column
up: (queryInterface, Sequelize) =>
  queryInterface.addColumn("jobs", "deleted_at", {
    type: Sequelize.DATE
  });

-------------------------------------------------------------------

## 6.16 Hard Delete Column
up: (queryInterface) =>
  queryInterface.removeColumn("jobs", "deleted_at");

-------------------------------------------------------------------

# 🌟 7. Important

- Never modify old migrations  
- Always create a NEW migration for every change  
- Always write a rollback  
- Test using:
  npm run migrate
  npm run migrate:undo
- Do not use sequelize.sync() in production  
- Use transactions for risky changes  
- Use clear migration names  

-------------------------------------------------------------------
# ✅ END OF DOCUMENT