import sequelize from "../database/sequelizeConfig.js";
import { DataTypes, Op } from 'sequelize';
import curriculumModel from "./curriculumModel.js";
import users from "./userModel.js";

const curriculumBatchMappingModel = sequelize.define(
    'curriculum_batch_mapping',
    {
        curriculumBatchMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'curriculum_batch_mapping_id'
        },
        curriculumId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'curriculum_id',
            references: {
                model: curriculumModel,
                key: 'curriculum_id'
            }
        },
        batch: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'batch'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        }
    },
    {
        tableName: 'curriculum_batch_mapping',
        timestamps: true
    }
);

/**
 * Validates that a batch cannot have more than one curriculum belonging to the same programme.
 * Basically one batch for one program will have only one mapping.
 */
export async function validateSingleCurriculumPerBatchAndProgramme(mapping, options = {}) {
    const curriculumId = mapping.curriculumId;
    const batch = mapping.batch;

    if (!curriculumId || !batch) {
        return;
    }

    // 1. Fetch the target curriculum to obtain its courseId (programme)
    const targetCurriculum = await curriculumModel.findByPk(curriculumId, {
        attributes: ['curriculumId', 'courseId', 'name'],
        transaction: options?.transaction
    });

    if (!targetCurriculum) {
        const err = new Error(`Curriculum with ID ${curriculumId} does not exist`);
        err.statusCode = 404;
        throw err;
    }

    // 2. Find all curriculums belonging to the same programme (courseId)
    const siblingCurriculums = await curriculumModel.findAll({
        where: { courseId: targetCurriculum.courseId },
        attributes: ['curriculumId', 'name'],
        transaction: options?.transaction
    });

    const siblingCurriculumIds = siblingCurriculums.map(c => c.curriculumId);

    // 3. Check if any curriculum belonging to this programme is already mapped to this batch
    const whereClause = {
        batch,
        curriculumId: { [Op.in]: siblingCurriculumIds }
    };

    if (mapping.curriculumBatchMappingId) {
        whereClause.curriculumBatchMappingId = { [Op.ne]: mapping.curriculumBatchMappingId };
    }

    const existingMapping = await curriculumBatchMappingModel.findOne({
        where: whereClause,
        transaction: options?.transaction
    });

    if (existingMapping) {
        const mappedCurriculum = siblingCurriculums.find(c => c.curriculumId === existingMapping.curriculumId);
        const mappedName = mappedCurriculum?.name || `ID ${existingMapping.curriculumId}`;
        const err = new Error(
            `A curriculum ('${mappedName}') belonging to this programme is already mapped to batch ${batch}. Only one curriculum per programme can be mapped to a batch.`
        );
        err.statusCode = 409;
        throw err;
    }
}

curriculumBatchMappingModel.beforeCreate(async (instance, options) => {
    await validateSingleCurriculumPerBatchAndProgramme(instance, options);
});

curriculumBatchMappingModel.beforeUpdate(async (instance, options) => {
    throw new Error('Batch-Curriculum mapping cannot be edited. It can only be created or deleted.');
});

curriculumBatchMappingModel.beforeBulkCreate(async (instances, options) => {
    for (const instance of instances) {
        await validateSingleCurriculumPerBatchAndProgramme(instance, options);
    }
});

async function createTermMappings(instance, options) {
    const { resolveTotalTerms, yearFromTerm } = await import('../utility/courseTerms.js');
    
    const curriculum = await curriculumModel.findByPk(instance.curriculumId, {
        include: [{ model: sequelize.models.course, as: 'course' }],
        transaction: options?.transaction
    });

    if (!curriculum || !curriculum.course) {
        console.warn(`Could not generate term mappings: Curriculum or Course not found for mapping ${instance.curriculumBatchMappingId}`);
        return;
    }

    const totalTerms = resolveTotalTerms(curriculum.course);
    const batch = instance.batch;
    
    const termsData = [];
    for (let term = 1; term <= totalTerms; term++) {
        const yearNum = yearFromTerm(term, curriculum.course);
        const calcYear = batch + yearNum - 1;

        termsData.push({
            curriculumBatchMappingId: instance.curriculumBatchMappingId,
            term: term,
            yearNumber: yearNum,
            year: calcYear,
            createdBy: instance.createdBy
        });
    }

    if (termsData.length > 0) {
        await sequelize.models.curriculum_batch_term_mapping.bulkCreate(termsData, {
            transaction: options?.transaction
        });
    }
}

curriculumBatchMappingModel.afterCreate(async (instance, options) => {
    await createTermMappings(instance, options);
});

curriculumBatchMappingModel.afterBulkCreate(async (instances, options) => {
    for (const instance of instances) {
        await createTermMappings(instance, options);
    }
});

/** Auto-delete term rows that were auto-created with this batch mapping. */
async function destroyTermMappings(instance, options) {
    await sequelize.models.curriculum_batch_term_mapping.destroy({
        where: { curriculumBatchMappingId: instance.curriculumBatchMappingId },
        transaction: options?.transaction,
    });
}

curriculumBatchMappingModel.beforeDestroy(async (instance, options) => {
    await destroyTermMappings(instance, options);
});

curriculumBatchMappingModel.beforeBulkDestroy(async (options) => {
    const rows = await curriculumBatchMappingModel.findAll({
        where: options.where,
        attributes: ['curriculumBatchMappingId'],
        transaction: options?.transaction,
    });
    if (rows.length === 0) return;

    const ids = rows.map((row) => row.curriculumBatchMappingId);
    await sequelize.models.curriculum_batch_term_mapping.destroy({
        where: { curriculumBatchMappingId: { [Op.in]: ids } },
        transaction: options?.transaction,
    });
});

export default curriculumBatchMappingModel;
