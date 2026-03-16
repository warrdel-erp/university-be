import * as SectionCreation from "../services/sectionServices.js";

export async function addSection(req, res) {
    const { sectionName, acedmicYearId } = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    try {
        if (!(sectionName && acedmicYearId)) {
            return res.status(400).send('sectionName and acedmicYearId is required')
        }
        const Section = await SectionCreation.addSection(req.body, createdBy, updatedBy, universityId, instituteId, role);
        res.status(201).json({ message: "Data added successfully", Section });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllSection(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    const { acedmicYearId } = req.query;
    try {
        const section = await SectionCreation.getSectionDetails(universityId, acedmicYearId, instituteId, role);
        res.status(200).json(section);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleSectionDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { sectionId } = req.query;
        const Section = await SectionCreation.getSingleSectionDetails(sectionId, universityId);
        if (Section) {
            res.status(200).json(Section);
        } else {
            res.status(404).json({ message: "Section not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateSection(req, res) {
    try {
        const updatedBy = req.user.userId;
        const { sectionId } = req.body
        if (!(sectionId)) {
            return res.status(400).send('sectionId is required')
        }
        const updatedSections = await SectionCreation.updateSection(sectionId, req.body, updatedBy);
        res.status(200).json({ message: "Section update succesfully", updatedSections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteSection(req, res) {
    try {
        const { sectionId } = req.query;
        if (!sectionId) {
            return res.status(400).json({ message: "sectionId is required" });
        }
        const deleted = await SectionCreation.deleteSection(sectionId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Section ID ${sectionId}` });
        } else {
            res.status(404).json({ message: "Section not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}