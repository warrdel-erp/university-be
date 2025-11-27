import * as DormitoryListCreation from "../services/dormitoryListServices.js";

export async function addDormitoryList(req, res) {
    const { dormitoryName, type, address, intake,acedmicYearId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const instituteId = req.user.instituteId;
    try {
        if (!(dormitoryName && type && address && intake && acedmicYearId)) {
            return res.status(400).send('dormitoryName,type,address,intake and acedmicYearId is required')
        }
        const DormitoryList = await DormitoryListCreation.addDormitoryList(req.body, createdBy, updatedBy,instituteId);
        res.status(201).json({ message: "Data added successfully", DormitoryList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllDormitoryList(req, res) {
    const universityId = req.user.universityId;
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    const {acedmicYearId} = req.query
    try {
        const libraries = await DormitoryListCreation.getDormitoryListDetails(universityId,acedmicYearId,role,instituteId);
        res.status(200).json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleDormitoryListDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { dormitoryListId } = req.query;
        const DormitoryList = await DormitoryListCreation.getSingleDormitoryListDetails(dormitoryListId, universityId);
        if (DormitoryList) {
            res.status(200).json(DormitoryList);
        } else {
            res.status(404).json({ message: "DormitoryList not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateDormitoryList(req, res) {
    try {
        const { dormitoryListId } = req.body
        if (!(dormitoryListId)) {
            return res.status(400).send('dormitoryListId is required')
        }
        const updatedBy = req.user.userId;
        const updatedDormitoryList = await DormitoryListCreation.updateDormitoryList(dormitoryListId, req.body, updatedBy);
        res.status(200).json({ message: "DormitoryList update succesfully", updateDormitoryList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteDormitoryList(req, res) {
    try {
        const { dormitoryListId } = req.query;
        if (!dormitoryListId) {
            return res.status(400).json({ message: "dormitoryListId is required" });
        }
        const deleted = await DormitoryListCreation.deleteDormitoryList(dormitoryListId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for DormitoryList ID ${dormitoryListId}` });
        } else {
            res.status(404).json({ message: "DormitoryList not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};