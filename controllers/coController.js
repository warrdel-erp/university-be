import * as coCreation from "../services/coServices.js";

export async function addCo(req, res) {
    const { acedmicYearId, syllabusDetailsId, subjectId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(acedmicYearId && syllabusDetailsId && subjectId)) {
            return res.status(400).send('acedmicYearId,syllabusDetailsId and subjectId is required')
        }
        const Po = await coCreation.addCo(req.body, createdBy, updatedBy, universityId, instituteId);
        res.status(201).json({ message: "Data added successfully", Po });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllCo(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const { acedmicYearId } = req.query
    try {
        const co = await coCreation.getAllCo(universityId, instituteId, role, acedmicYearId);
        res.status(200).json(co);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleCoDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { coId } = req.query;
        const co = await coCreation.getSingleCoDetails(coId, universityId);
        if (co) {
            res.status(200).json(co);
        } else {
            res.status(404).json({ message: "co not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateCo(req, res) {
    try {
        const { coId } = req.body
        if (!(coId)) {
            return res.status(400).send('coId is required')
        }
        const updatedBy = req.user.userId;
        const updatedPo = await coCreation.updateCo(coId, req.body, updatedBy);
        res.status(200).json({ message: "Po update succesfully", updatedPo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteCo(req, res) {
    try {
        const { coId } = req.query;
        if (!coId) {
            return res.status(400).json({ message: "coId is required" });
        }
        const deleted = await coCreation.deleteCo(coId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Po ID ${coId}` });
        } else {
            res.status(404).json({ message: "Po not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addCoWeightage(req, res) {
    const { coId, term, acedmicYearId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if (!(acedmicYearId && coId && term)) {
            return res.status(400).send('acedmicYearId,coId and term is required')
        }
        const Po = await coCreation.addCoWeightage(req.body, createdBy, updatedBy, universityId, instituteId);
        res.status(201).json({ message: "Data added successfully", Po });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllCoWeightage(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const { acedmicYearId } = req.query
    try {
        const co = await coCreation.getAllCoWeightage(universityId, instituteId, role, acedmicYearId);
        res.status(200).json(co);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleCoDetailsWeightage(req, res) {
    const universityId = req.user.universityId;
    try {
        const { coWeightageId } = req.query;
        const co = await coCreation.getSingleCoDetailsWeightage(coWeightageId, universityId);
        if (co) {
            res.status(200).json(co);
        } else {
            res.status(404).json({ message: "co not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateCoWeightage(req, res) {
    try {
        const { coWeightageId } = req.body
        if (!(coWeightageId)) {
            return res.status(400).send('coWeightageId is required')
        }
        const updatedBy = req.user.userId;
        const updatedPo = await coCreation.updateCoWeightage(coWeightageId, req.body, updatedBy);
        res.status(200).json({ message: "Po update succesfully", updatedPo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}