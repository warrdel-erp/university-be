import * as electiveSubject  from  "../services/electiveSubjectService.js";
import { SuccessResponse } from "../utility/response.js";

export async function addElectiveSubject(req, res) {
    const { electiveSubjectName, academicYearId, electiveSubjectType } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    try {
        if (!(electiveSubjectName && academicYearId && electiveSubjectType)) {
            return res.status(400).send('Elective Subject Name, academicYearId and electiveSubjectType is required');
        }

        const electiveSubjects = await electiveSubject.addElectiveSubject(req.body, createdBy, updatedBy);
        res.status(201).json({ message: 'Data added successfully', electiveSubjects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllElectiveSubject(req, res) {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const result = await electiveSubject.getElectiveSubjectDetails({ page, limit, search });
        
        return SuccessResponse(
            res,
            200,
            "Elective subjects fetched successfully",
            result.rows,
            {
                total: result.total,
                limit: parseInt(limit, 10),
                page: parseInt(page, 10),
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleElectiveSubjectDetails(req, res) {
    try {
        const { electiveSubjectId } = req.query;
        const electiveSubjects = await electiveSubject.getSingleElectiveSubjectDetails(electiveSubjectId);
        if (electiveSubjects) {
            res.status(200).json(electiveSubjects);
        } else {
            res.status(404).json({ message: "electiveSubject not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateElectiveSubject(req, res) {
    try {
        const {electiveSubjectId} = req.body
        if(!(electiveSubjectId)){
            return res.status(400).send('ElectiveSubjectId is required')
         }
         const updatedBy = req.user.userId;
        const updatedElectiveSubjects = await electiveSubject.updateElectiveSubject(electiveSubjectId, req.body,updatedBy);
            res.status(200).json({message: "electiveSubject update succesfully",updatedElectiveSubjects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteElectiveSubject(req, res) {
    try {
        const { electiveSubjectId } = req.query;
        if (!electiveSubjectId) {
            return res.status(400).json({ message: "ElectiveSubjectId is required" });
        }
        const deleted = await electiveSubject.deleteElectiveSubject(electiveSubjectId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for electiveSubject ID ${electiveSubjectId}` });
        } else {
            res.status(404).json({ message: "electiveSubject not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getMappedStudents(req, res) {
    try {
        const { electiveSubjectId, page, limit, search } = req.query;
        if (!electiveSubjectId) {
            return res.status(400).json({ message: "electiveSubjectId is required" });
        }
        const result = await electiveSubject.getMappedStudents(electiveSubjectId, { page, limit, search });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getEligibleStudents(req, res) {
    try {
        const { electiveSubjectId, page, limit, search } = req.query;
        if (!electiveSubjectId) {
            return res.status(400).json({ message: "electiveSubjectId is required" });
        }
        const result = await electiveSubject.getEligibleStudents(electiveSubjectId, { page, limit, search });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function mapStudents(req, res) {
    try {
        const { electiveSubjectId, studentIds } = req.body;
        const createdBy = req.user.userId;

        if (!electiveSubjectId || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: "electiveSubjectId and non-empty studentIds array are required" });
        }

        const result = await electiveSubject.mapStudents(electiveSubjectId, studentIds, createdBy);
        res.status(201).json({ message: "Students mapped successfully", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function unmapStudent(req, res) {
    try {
        const { electiveSubjectId, studentId } = req.query;
        if (!electiveSubjectId || !studentId) {
            return res.status(400).json({ message: "electiveSubjectId and studentId are required" });
        }

        const unmapped = await electiveSubject.unmapStudent(electiveSubjectId, studentId);
        if (unmapped) {
            res.status(200).json({ message: "Student unmapped successfully" });
        } else {
            res.status(404).json({ message: "Mapping not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}