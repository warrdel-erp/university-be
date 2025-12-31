import * as gradeSchemeService from "../services/gradeService.js";

export async function addGradeScheme(req, res) {
  try {
    const data = {
      universityId: req.user.universityId,
      instituteId: req.user.instituteId,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
      ...req.body
    };

    const result = await gradeSchemeService.addGradeScheme(data);

    return res.status(201).json({
      success: true,
      message: "Grade scheme added successfully",
      data: result
    });

  } catch (error) {
    console.error("Error in addGradeScheme:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAllGradeSchemes(req, res) {
  try {
    const { universityId, instituteId, role } = req.user;
    const result = await gradeSchemeService.getAllGradeSchemes(
      universityId,
      instituteId,
      role
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getAllGradeSchemes:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSingleGradeScheme(req, res) {
  try {
    const result = await gradeSchemeService.getSingleGradeScheme(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in getSingleGradeScheme:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateGradeScheme(req, res) {
  try {
    const result = await gradeSchemeService.updateGradeScheme(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Grade scheme updated successfully",
      data: result
    });

  } catch (error) {
    console.error("Error in updateGradeScheme:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteGradeScheme(req, res) {
  try {
    await gradeSchemeService.deleteGradeScheme(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Grade scheme deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteGradeScheme:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}