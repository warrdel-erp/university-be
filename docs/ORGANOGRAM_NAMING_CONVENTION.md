# Org (organogram) & department naming convention

> Guide for current naming and any future rename. Do not rename `sub_account` / `department` without a migration + client update.

## Locked decisions

- Keep **`sub_account`** as-is (it is the real department / org unit).
- Use short prefix **`org`** (not full `organogram`) for new organogram tables and APIs.
- Position holders live in **`org_position_head`** (not `*_assignment`).
- Heads are linked by **`user_id`**.

## Current vs intended meaning

| Current table / route | What it actually is | Future rename (optional later) |
|---|---|---|
| `sub_account` / `/subAccount` | **Department** (org unit node) | `department` / `/department` |
| `department` / `/department` | Sub-unit under a department | `sub_department` or `department_unit` |
| `department_structure` / `/departmentStructure` | Org **tree edges** (parent → child `sub_account`) | `org_structure` or keep |
| `account` | Top group (Admin, Academics, …) | keep `account` |
| `org_position` | Position on a structure node | keep |
| `org_position_head` | User holding a position (`user_id`) | keep |

Code already documents the `sub_account` / `department` name swap:

```js
// server.js
app.use("/subAccount", subAccount); // this is department
app.use("/department", department); // this is sub_account
```

## Relationship (as used today)

```
account
  └── sub_account                 ← real "department" (node) — KEEP this name
        ├── department            ← sub-unit (staff etc.) — NOT org attachment point
        └── department_structure  ← organogram tree edge
              ├── sub_account_id       = child department
              └── parent_account_id    = parent department
                    └── org_position
                          └── org_position_head (user_id)
```

## Rules for org feature work

1. Treat **`sub_account` as department** in product language; do not rename the table for now.
2. Hang positions on **`department_structure`**, not on `department`.
3. Assign people via **`user_id`** on `org_position_head`.
4. Prefer short names: `org_*` tables, `/org` API, `org*` source files.

## File naming (org feature)

| Layer | File | Role |
|---|---|---|
| Model | `orgPositionModel.js` | Table `org_position` |
| Model | `orgPositionHeadModel.js` | Table `org_position_head` |
| Repository | `orgRepository.js` | Org data access |
| Service | `orgServices.js` | Org business logic |
| Controller | `orgController.js` | HTTP handlers |
| Router | `orgRoute.js` | Routes mounted at `/org` |
| Migration | `20260722190000-create-org-position.cjs` | Creates `org_position` |
| Migration | `20260722190100-create-org-position-head.cjs` | Creates `org_position_head` |

Run: `npm run migrate`
| Docs | `ORGANOGRAM_NAMING_CONVENTION.md` | This guide |

API layer files use the **feature** name `org*`. Model files match the **DB table** entity name.

## API prefixes (today)

- `/subAccount` — department (org unit) CRUD
- `/department` — sub-unit CRUD
- `/departmentStructure` — tree CRUD
- `/org` — org positions + heads
  - positions: `POST/GET/PATCH/DELETE /org/`, `GET /org/single`, `POST /org/markVacant`
  - heads: `POST/GET/PATCH/DELETE /org/head`

**Postman:** [univ-v2-organogram.postman_collection.json](./postman/univ-v2-organogram.postman_collection.json) · [ORGANOGRAM_POSTMAN.md](./postman/ORGANOGRAM_POSTMAN.md)

### Main payload keys

| Entity | Keys |
|---|---|
| Position | `orgPositionId`, `departmentStructureId`, `positionName`, `positionCode`, `employmentCategory`, `reportsToOrgPositionId`, `reportingType`, `isVacant`, `sortOrder` |
| Head | `orgPositionHeadId`, `orgPositionId`, `userId`, `holderType` (`PRIMARY` \| `ACTING`), `status` (`ACTIVE` \| `INACTIVE`), `joiningDate`, `endDate` |

## Future rename checklist (`sub_account` ↔ `department`)

Only when deliberately starting a rename sprint:

1. DB migration: rename tables/columns + FKs
2. Sequelize models + `models/index.js` associations/aliases
3. Repositories, services, controllers, routers, `server.js` mounts
4. Scoped / auth if keyed by model name
5. Postman + frontend paths/payload keys
6. Temporary dual routes if clients cannot cut over in one release
