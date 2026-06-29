import * as model from '../models/index.js';
import { scoped } from '../utility/scoped.js';

async function assertScopedEmployee(employeeId, transaction) {
    return scoped(model.employeeModel).findOne({
        where: { employeeId },
        attributes: ['employeeId'],
        transaction,
    });
}

export async function employeeMetaData(data, transaction) {
    try {
        for (const entry of data) {
            const employee = await assertScopedEmployee(entry.employeeId, transaction);
            if (!employee) {
                throw new Error(`Employee not found: ${entry.employeeId}`);
            }
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
            where: { employeeId },
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
            if (!entry.employeeId || !entry.types || !entry.codes) {
                console.warn(" Skipping invalid entry →", entry);
                skipped++;
                continue;
            }

            const employee = await assertScopedEmployee(entry.employeeId, transaction);
            if (!employee) {
                console.warn(` Skipping out-of-scope employeeId=${entry.employeeId}`);
                skipped++;
                continue;
            }

            try {
                const [affectedCount] = await model.employeeMetaDataModel.update(
                    {
                        types: entry.types,
                        created_by: entry.createdBy,
                        updated_by: entry.updatedBy || null,
                    },
                    {
                        where: {
                            employee_id: entry.employeeId,
                            codes: entry.codes,
                        },
                        transaction,
                    },
                );

                if (affectedCount > 0) {
                    updated++;
                } else {
                    await model.employeeMetaDataModel.create(
                        {
                            employeeId: entry.employeeId,
                            types: entry.types,
                            codes: entry.codes,
                            createdBy: entry.createdBy,
                            updatedBy: entry.updatedBy,
                        },
                        { transaction },
                    );
                    inserted++;
                }
            } catch (innerError) {
                console.error(
                    `Error processing entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`,
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
