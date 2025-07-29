import * as lesson  from  "../services/LessonServices.js";

export async function addLesson(req, res) {        
    const {name,subjectId,acedmicYearId,sessionId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(name && subjectId  && acedmicYearId && sessionId)){
           return res.status(400).send('name,subjectId,acedmicYearId and sessionId is required')
        }
        const lessonData = await lesson.addLesson(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllLesson(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;    
    const {acedmicYearId} = req.query
    try {
        const Lessons = await lesson.getLessonDetails(universityId,instituteId,role,acedmicYearId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleLessonDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { lessonId } = req.query;
        const lessonDetail = await lesson.getSingleLessonDetails(lessonId);
        if (lessonDetail) {
            res.status(200).json(lessonDetail);
        } else {
            res.status(404).json({ message: "lesson Detail not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addTopice(req, res) {        
    const {name,lessonId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(name && lessonId)){
           return res.status(400).send('name and lessionId is required')
        }
        const lessonData = await lesson.addTopice(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addMapping(req, res) {        
    const {topicId,timeTableMappingId,date} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(topicId && timeTableMappingId && date)){
           return res.status(400).send('topiceId,timeTableMappingId and date is required')
        }
        const lessonData = await lesson.addMapping(req.body,createdBy,updatedBy,universityId,instituteId);
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getMapping(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;    
    const {acedmicYearId} = req.query
    try {
        const Lessons = await lesson.getMapping(universityId,instituteId,role,acedmicYearId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateMapping(req, res) {
    const {completeDate,lessonMappingId} = req.body
    if(!(completeDate && lessonMappingId)){
           return res.status(400).send('completeDate and lessionMappingId is required')
        }
    try {
        const Lessons = await lesson.updateMapping(completeDate,lessonMappingId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};