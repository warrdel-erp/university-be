import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(id, transaction) {
    if (!id) return null;
    const numId = Number(id);
    if (isNaN(numId)) return null;
    let employee = await scoped(model.employeeModel).findOne({
        where: { employeeId: numId },
        attributes: ['employeeId'],
        transaction,
    });
    if (!employee) {
        employee = await scoped(model.employeeModel).findOne({
            where: { userId: numId },
            attributes: ['employeeId'],
            transaction,
        });
    }
    return employee;
}

export async function employeeMetaData(data, transaction) {
    try {
        for (const entry of data) {
            const rawId = entry.employeeId || entry.userId;
            const employee = await assertScopedEmployee(rawId, transaction);
            if (!employee) {
                throw new Error(`Employee not found: ${rawId}`);
            }
            entry.employeeId = employee.employeeId;
        }
        return await model.employeeMetaDataModel.bulkCreate(data, { transaction });
    } catch (error) {
        console.error("Error in adding meta data employee:", error);
        throw error;
    }
};

export async function deleteEmployeeMetaData(employeeId) {
    try {
        const employee = await assertScopedEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        await model.employeeMetaDataModel.destroy({
            where: { employeeId: employee.employeeId },
            individualHooks: true,
        });
        return { message: 'employee meta data deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function updateEmployeeMetaData(entries, transaction) {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    try {
        for (const entry of entries) {
            const rawId = entry.employeeId || entry.userId;
            if (!rawId || !entry.types || !entry.codes) {
                console.warn(" Skipping invalid entry →", entry);
                skipped++;
                continue;
            }

            const employee = await assertScopedEmployee(rawId, transaction);
            if (!employee) {
                console.warn(` Skipping out-of-scope employeeId=${rawId}`);
                skipped++;
                continue;
            }

            const targetEmployeeId = employee.employeeId;

            try {
                const existing = await model.employeeMetaDataModel.findOne({
                    where: {
                        employeeId: targetEmployeeId,
                        codes: entry.codes,
                    },
                    transaction,
                });

                if (existing) {
                    await existing.update(
                        { types: entry.types },
                        { transaction },
                    );
                    updated++;
                } else {
                    await model.employeeMetaDataModel.create(
                        {
                            employeeId: targetEmployeeId,
                            types: entry.types,
                            codes: entry.codes,
                            createdBy: entry.createdBy || 1,
                        },
                        { transaction },
                    );
                    inserted++;
                }
            } catch (innerError) {
                console.error(
                    `Error processing entry → employeeId=${targetEmployeeId}, types=${entry.types}, codes=${entry.codes}`,
                    innerError,
                );
                throw innerError;
            }
        }

        console.log(
            ` Summary: ${inserted} inserted, ${updated} updated, ${skipped} skipped`,
        );

        return true;
    } catch (error) {
        console.error(" Error replacing employee meta data entries:", error);
        throw error;
    }
}
