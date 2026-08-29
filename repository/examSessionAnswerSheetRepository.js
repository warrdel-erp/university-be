import { scoped } from '../utility/scoped.js';
import * as model from '../models/index.js';

export async function create(data) {
    return model.examSessionAnswerSheetModel.create(data);
}

export async function findByExaminationSession(examinationSessionId) {
    return scoped(model.examSessionAnswerSheetModel).findAll({
        where: { examinationSessionId },
        include: [
            {
                model: model.s3FileModel,
                as: 's3File',
            },
            {
                model: model.userModel,
                as: 'creator',
                attributes: ['userId', 'userName', 'email'],
            },
        ],
        order: [['created_at', 'DESC']],
    });
}

export async function findByS3FileId(s3FileId) {
    return model.examSessionAnswerSheetModel.findOne({
        where: { s3FileId },
    });
}
