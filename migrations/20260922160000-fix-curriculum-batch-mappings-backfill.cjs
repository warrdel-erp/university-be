'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { Op } = await import('sequelize');
    const dbModule = await import('../models/index.js');
    
    const models = dbModule;
    const sequelizeModule = await import('../database/sequelizeConfig.js');
    const sequelize = sequelizeModule.default;

    return sequelize.transaction(async (t) => {
      const unresolvedMappings = await models.curriculumBatchMappingModel.findAll({
        where: { sessionBatchMappingId: null },
        transaction: t,
      });

      console.log(`Found ${unresolvedMappings.length} unresolved curriculum mappings to backfill.`);

      for (const mapping of unresolvedMappings) {
        const curriculum = await models.curriculumModel.findByPk(mapping.curriculumId, {
          attributes: ['courseId'],
          transaction: t,
        });

        if (!curriculum) continue;

        const sessionCourseMappings = await models.sessionCouseMappingModel.findAll({
          where: { courseId: curriculum.courseId },
          transaction: t,
        });

        const sessionIds = sessionCourseMappings.map(scm => scm.sessionId);
        
        let matchingSessionBatches = [];
        if (sessionIds.length > 0) {
            matchingSessionBatches = await models.sessionBatchMappingModel.findAll({
              where: {
                sessionId: { [Op.in]: sessionIds },
                batch: mapping.batch,
              },
              transaction: t,
            });
        }

        if (matchingSessionBatches.length > 0) {
          console.log(`Curriculum Mapping ID ${mapping.curriculumBatchMappingId} (batch ${mapping.batch}) has ${matchingSessionBatches.length} session candidate(s). Creating distinct mappings...`);
          
          for (const sbm of matchingSessionBatches) {
            const exists = await models.curriculumBatchMappingModel.findOne({
               where: {
                 curriculumId: mapping.curriculumId,
                 sessionBatchMappingId: sbm.sessionBatchMappingId
               },
               transaction: t
            });

            if (!exists) {
              await models.curriculumBatchMappingModel.create({
                curriculumId: mapping.curriculumId,
                batch: mapping.batch,
                sessionBatchMappingId: sbm.sessionBatchMappingId,
                createdBy: mapping.createdBy,
              }, { transaction: t });
            }
          }
          
          await mapping.destroy({ transaction: t });
        } else {
          console.log(`Curriculum Mapping ID ${mapping.curriculumBatchMappingId} has 0 session candidates. Cannot auto-resolve. Removing it to satisfy NOT NULL constraints.`);
          await mapping.destroy({ transaction: t });
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {}
};
