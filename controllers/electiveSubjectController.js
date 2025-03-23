import * as electiveSubject  from  "../services/electiveSubjectService.js";

export async function addElectiveSubject(req, res) {
    const {electiveSubjectName} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    try {
        if(!(electiveSubjectName )){
           return res.status(400).send('Elective Subject Name is required')
        }
        const electiveSubjects = await electiveSubject.addElectiveSubject(req.body,createdBy,updatedBy,universityId);
        res.status(201).json({ message: "Data added successfully", electiveSubjects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllElectiveSubject(req, res) {
    const universityId = req.user.universityId;
    try {
        const electiveSubjects = await electiveSubject.getElectiveSubjectDetails(universityId);
        res.status(200).json(electiveSubjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleElectiveSubjectDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { electiveSubjectId } = req.query;
        const electiveSubjects = await electiveSubject.getSingleElectiveSubjectDetails(electiveSubjectId,universityId);
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