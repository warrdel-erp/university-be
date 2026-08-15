import * as lesson from "../services/lessonServices.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";
import { validateEmployeeUser } from "../utility/employeeValidation.js";
import { getAcademicYearId } from "../utility/requestContext.js";

export async function addLesson(req, res) {
    const { name, subjectId, sessionId, lectureWindowId } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return res.status(400).send("academicYearId not found in user session");
        }
        if (!(name && subjectId && sessionId && lectureWindowId)) {
            return res.status(400).send("name, subjectId, sessionId and lectureWindowId are required");
        }
        const lessonData = await lesson.addLesson(
            { ...req.body, academicYearId: Number(academicYearId) },
            createdBy,
            updatedBy,
        );
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        const statusCode = /not found/i.test(error.message) ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

export async function getAllLesson(req, res) {
    const { academicYearId } = req.query
    try {
        const Lessons = await lesson.getLessonDetails(academicYearId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleLessonDetails(req, res) {
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
    const { name, lessonId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!(name && lessonId)) {
            return res.status(400).send('name and lessionId is required')
        }
        const lessonData = await lesson.addTopice(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateTopic(req, res) {
    try {
        const { topicId } = req.params;
        const updatedBy = req.user.userId;
        const lessonData = await lesson.updateTopic(Number(topicId), req.body, updatedBy);
        return SuccessResponse(res, 200, "Topic updated successfully", lessonData);
    } catch (error) {
        console.error("Error in updateTopic:", error);
        const statusCode = error.statusCode || (/not found/i.test(error.message) ? 404 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function deleteTopic(req, res) {
    try {
        const { topicId } = req.params;
        await lesson.deleteTopic(Number(topicId));
        return SuccessResponse(res, 200, "Topic deleted successfully");
    } catch (error) {
        console.error("Error in deleteTopic:", error);
        const statusCode = error.statusCode
            || (/not found/i.test(error.message) ? 404 : /cannot be deleted/i.test(error.message) ? 409 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function updateLesson(req, res) {
    try {
        const { lessonId } = req.params;
        const updatedBy = req.user.userId;
        const academicYearId = getAcademicYearId();
        const lessonData = await lesson.updateLesson(
            Number(lessonId),
            { ...req.body, academicYearId },
            updatedBy,
        );
        return SuccessResponse(res, 200, "Lesson updated successfully", lessonData);
    } catch (error) {
        console.error("Error in updateLesson:", error);
        const statusCode = error.statusCode || (/not found/i.test(error.message) ? 404 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function deleteLesson(req, res) {
    try {
        const { lessonId } = req.params;
        await lesson.deleteLesson(Number(lessonId));
        return SuccessResponse(res, 200, "Lesson deleted successfully");
    } catch (error) {
        console.error("Error in deleteLesson:", error);
        const statusCode = error.statusCode
            || (/not found/i.test(error.message) ? 404 : /cannot be deleted/i.test(error.message) ? 409 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function addMapping(req, res) {
    const { topicId, timeTableCellDateWiseId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if (!(topicId && timeTableCellDateWiseId)) {
            return res.status(400).send('topicId and timeTableCellDateWiseId are required')
        }
        const lessonData = await lesson.addMapping(req.body, createdBy, updatedBy);
        res.status(201).json({ message: "Data added successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function copyMapping(req, res) {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const lessonData = await lesson.copyMapping(req.body, createdBy, updatedBy);
        return SuccessResponse(res, 201, lessonData.message, {
            copied: lessonData.copied,
            sourceLessonMappingId: lessonData.sourceLessonMappingId,
        });
    } catch (error) {
        console.error("Error in copyMapping:", error);
        const statusCode = error.statusCode || (/not found/i.test(error.message) ? 404 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function getMapping(req, res) {
    const { academicYearId } = req.query
    try {
        const Lessons = await lesson.getMapping(academicYearId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateMapping(req, res) {
    const { completeDate, lessonMappingId } = req.body
    if (!(completeDate && lessonMappingId)) {
        return res.status(400).send('completeDate and lessionMappingId is required')
    }
    try {
        const Lessons = await lesson.updateMapping(completeDate, lessonMappingId);
        res.status(200).json(Lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateCompleteMapping(req, res) {
    const { lessonMappingId } = req.params;
    const updatedBy = req.user.userId;
    try {
        if (!lessonMappingId) {
            return res.status(400).send("Mapping ID is required");
        }
        const lessonData = await lesson.updateCompleteMapping(lessonMappingId, req.body, updatedBy);
        res.status(200).json({ message: "Data updated successfully", lessonData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteMapping(req, res) {
    const { lessonMappingId } = req.params;
    try {
        if (!lessonMappingId) {
            return res.status(400).send("Mapping ID is required");
        }
        await lesson.deleteMapping(lessonMappingId);
        res.status(200).json({ message: "Mapping deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getEmployeeSubjectAndLesson(req, res) {
    const { userId, courseId, sessionId, subjectSearch, subjectId } = req.query
    try {
        const Lessons = await lesson.getEmployeeSubjectAndLesson(
            userId,
            courseId,
            sessionId,
            subjectSearch,
            subjectId,
        );
        return SuccessResponse(res, 200, "Employee subject and lessons fetched successfully", Lessons);
    } catch (error) {
        console.error("Error in getEmployeeSubjectAndLesson:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};

export async function getMyEmployeeSubjectAndLesson(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        const { userId } = validation;
        const { courseId, sessionId, subjectSearch, subjectId } = req.query;
        const Lessons = await lesson.getEmployeeSubjectAndLesson(
            userId,
            courseId,
            sessionId,
            subjectSearch,
            subjectId,
        );
        return SuccessResponse(res, 200, "Employee subject and lessons fetched successfully", Lessons);
    } catch (error) {
        console.error("Error in getMyEmployeeSubjectAndLesson:", error);
        return ErrorResponse(res, 500, error.message || "Internal Server Error");
    }
};

export async function getSimpleLessonList(req, res) {
    try {
        const result = await lesson.getSimpleLessonList(req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function linkLessonsToWindow(req, res) {
    try {
        const academicYearId = getAcademicYearId();
        if (!academicYearId) {
            return ErrorResponse(res, 400, "academicYearId not found in user session");
        }

        const { lessonId } = req.query;
        const { lectureWindowId } = req.body;
        const updatedBy = req.user.userId;

        const linkedCount = await lesson.linkLessonsToWindow(
            lectureWindowId,
            [lessonId],
            updatedBy,
            Number(academicYearId),
        );
        const result = await lesson.getLectureWindowById(lectureWindowId, Number(academicYearId));

        return SuccessResponse(res, 200, "Lessons linked successfully", { linkedCount, result });
    } catch (error) {
        console.error("Error in linkLessonsToWindow:", error);
        const statusCode = /not found/i.test(error.message) ? 404 : 500;
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function getRoutineByTeacher(req, res) {
    try {
        const { userId, courseId, sessionId, subjectId, date } = req.query;
        const result = await lesson.getRoutineByTeacherForLesson(
            userId,
            courseId,
            sessionId,
            subjectId,
            date,
        );
        return SuccessResponse(res, 200, "Teacher lesson routine fetched successfully", result);
    } catch (error) {
        console.error("Error in getRoutineByTeacher:", error);
        const status = /required|must be sent/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export async function getMyRoutineByTeacher(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        const { userId } = validation;
        const { courseId, sessionId, subjectId, date } = req.query;
        const result = await lesson.getRoutineByTeacherForLesson(
            userId,
            courseId,
            sessionId,
            subjectId,
            date,
        );
        return SuccessResponse(res, 200, "Teacher lesson routine fetched successfully", result);
    } catch (error) {
        console.error("Error in getMyRoutineByTeacher:", error);
        const status = /required|must be sent/i.test(error.message) ? 400 : 500;
        return ErrorResponse(res, status, error.message || "Internal Server Error");
    }
};

export async function getMappedLessonProgress(req, res) {
    try {
        const { userId, subjectId, courseId, sessionId, lessonId, status } = req.query;
        const result = await lesson.getMappedLessonProgress({
            userId: Number(userId),
            subjectId: Number(subjectId),
            courseId: courseId != null ? Number(courseId) : undefined,
            sessionId: sessionId != null ? Number(sessionId) : undefined,
            lessonId: lessonId != null ? Number(lessonId) : undefined,
            status,
        });
        return SuccessResponse(res, 200, "Mapped lesson plans fetched successfully", result);
    } catch (error) {
        console.error("Error in getMappedLessonProgress:", error);
        const statusCode = error.statusCode || (/required/i.test(error.message) ? 400 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};

export async function getMyMappedLessonProgress(req, res) {
    try {
        const validation = await validateEmployeeUser(req, res);
        if (!validation.valid) {
            return ErrorResponse(res, validation.status, validation.message);
        }
        const { userId } = validation;
        const { subjectId, courseId, sessionId, lessonId, status } = req.query;
        const result = await lesson.getMappedLessonProgress({
            userId: Number(userId),
            subjectId: Number(subjectId),
            courseId: courseId != null ? Number(courseId) : undefined,
            sessionId: sessionId != null ? Number(sessionId) : undefined,
            lessonId: lessonId != null ? Number(lessonId) : undefined,
            status,
        });
        return SuccessResponse(res, 200, "Mapped lesson plans fetched successfully", result);
    } catch (error) {
        console.error("Error in getMyMappedLessonProgress:", error);
        const statusCode = error.statusCode || (/required/i.test(error.message) ? 400 : 500);
        return ErrorResponse(res, statusCode, error.message || "Internal Server Error");
    }
};
