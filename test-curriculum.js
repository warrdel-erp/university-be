import './database/sequelizeConfig.js';
import * as curriculumService from './services/curriculumService.js';
import { scoped } from './utility/scoped.js';
import * as models from './models/index.js';

(async () => {
    try {
        const c = await models.curriculumModel.findOne({ order: [['created_at', 'DESC']]});
        if (!c) {
            console.log("No curriculum found");
            process.exit(0);
        }
        console.log("Fetching details for:", c.curriculumId);
        const details = await curriculumService.getById(c.curriculumId);
        console.log(JSON.stringify(details, null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
