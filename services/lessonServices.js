import * as lesson  from "../repository/LessonRepository.js";
import sequelize from '../database/sequelizeConfig.js';

export async function addLesson(data, createdBy, updatedBy, universityId, instituteId) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
            universityId,
            instituteId
        };

        return await lesson.addLesson(payload);
    } catch (error) {
        console.error("Error in addLesson:", error);
        throw error; 
    }
};

export async function getLessonDetails(universityId,instituteId,role,acedmicYearId) {
    return await lesson.getLessonDetails(universityId,instituteId,role,acedmicYearId);
};

export async function getSingleLessonDetails(lessonId) {
    return await lesson.getSingleLessonDetails(lessonId);
};

export async function addTopice(data, createdBy, updatedBy, universityId, instituteId) {
    try {
        const payload = {
            ...data,
            createdBy,
            updatedBy,
            universityId,
            instituteId
        };

        return await lesson.addTopic(payload);
    } catch (error) {
        console.error("Error in add topic:", error);
        throw error; 
    }
};

export async function addMapping(data, createdBy, updatedBy, universityId, instituteId) {
  const transaction = await sequelize.transaction();

  try {
    const payload = {
      topicId: data.topicId,
      timeTableMappingId: data.timeTableMappingId,
      date: data.date,
      completeDate: data.completeDate || null,
      note: data.note || null,
      lectureUrl: data.lectureUrl || null,
      file: data.file || null,
      status: data.status || 'inComplete',
      createdBy,
      updatedBy,
      universityId,
      instituteId
    };

    const lessonMapping = await lesson.addLessionMapping(payload, transaction);

    if (data.subTopic && Array.isArray(data.subTopic)) {
      for (const sub of data.subTopic) {
        const subTopicData = {
          name: sub.name,
          description: sub.description || null,
          topicId: data.topicId, 
          universityId,
          instituteId,
          createdBy,
          updatedBy
        };

        await lesson.addSubTopic(subTopicData, transaction);
      }
    }

    await transaction.commit();
    return { message: "Lesson mapping and sub-topics added successfully" };
  } catch (error) {
    await transaction.rollback();
    console.error("Error in addMapping:", error);
    throw error;
  }
};

export async function getMapping(universityId, instituteId, role, acedmicYearId) {
  try {
    const originalData = await lesson.getMapping(universityId, instituteId, role, acedmicYearId);

    const grouped = {};

    originalData.forEach(item => {
      const empDetails = item.timeTableMapping?.employeeDetails;
      if (!empDetails) return;  // skip if no employee details

      const empId = empDetails.employeeId;

      if (!grouped[empId]) {
        grouped[empId] = {
          employeeId: empId,
          employeeName: empDetails.employeeName,
          employeeCode: empDetails.employeeCode,
          pickColor: empDetails.pickColor,
          timeTables: []
        };
      }

      const ttMapping = item.timeTableMapping || {};
      const ttCreate = ttMapping.timeTablecreate || {};
      const classSection = ttCreate.timeTableClassSection || {};
      const subject = item.mappingTopic?.lessonTopic?.lessonSubject || {};
      const lesson = item.mappingTopic?.lessonTopic || {};
      const topic = item.mappingTopic || {};
      const subTopics = topic.subTopic || [];

      grouped[empId].timeTables.push({
        timeTableMappingId: ttMapping.timeTableMappingId,
        day: ttMapping.day,
        period: ttMapping.period,
        timeTableType: ttMapping.timeTableType,
        classSection,
        subject,
        lesson: {
          lessonId: lesson.lessonId,
          name: lesson.name,
          description: lesson.description
        },
        topic: {
          topicId: topic.topicId,
          name: topic.name,
          description: topic.description,
          subTopics
        }
      });
    });

    const filteredData = Object.values(grouped);

    return {
      original: originalData,
      filtered: filteredData
    };

  } catch (error) {
    console.error("Error in getMapping:", error);
    throw error;
  }
};