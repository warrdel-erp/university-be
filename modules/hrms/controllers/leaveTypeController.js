import * as service from "../services/leaveTypeService.js";

export async function createLeaveType(req, res) {
  try {
    const leaveType = await service.createLeaveType(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Leave type created successfully",
      data: leaveType,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAllLeaveTypes(req, res) {
  try {
    const filters = {
      search: req.query.search,
      classification: req.query.classification,
      status: req.query.status,
    };

    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await service.getAllLeaveTypes(filters, pagination);

    if (pagination.limit) {
      const page = Math.max(1, parseInt(pagination.page, 10) || 1);
      const limit = Math.max(1, parseInt(pagination.limit, 10) || 10);
      res.status(200).json({
        success: true,
        total: result.count,
        page,
        limit,
        totalPages: Math.ceil(result.count / limit),
        data: result.rows,
      });
    } else {
      res.status(200).json({
        success: true,
        total: result.length,
        data: result,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getLeaveTypeById(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.leaveTypeId;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id parameter is required",
      });
    }

    const leaveType = await service.getLeaveTypeById(parseInt(id, 10));
    res.status(200).json({
      success: true,
      data: leaveType,
    });
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
}

export async function updateLeaveType(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.leaveTypeId;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required in params or body",
      });
    }

    const updated = await service.updateLeaveType(parseInt(id, 10), req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Leave type updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function updateLeaveTypeStatus(req, res) {
  try {
    const id = req.params.id || req.body.id || req.body.leaveTypeId;
    const status = req.body.status;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required in params or body",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required in body ('Active', 'Inactive', 'Draft', 'Published')",
      });
    }

    const updated = await service.updateLeaveTypeStatus(parseInt(id, 10), status, req.user);
    res.status(200).json({
      success: true,
      message: `Leave type status updated to '${status}' successfully`,
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function deleteLeaveType(req, res) {
  try {
    const id = req.params.id || req.query.id || req.query.leaveTypeId;
    const force = req.query.force === "true" || req.query.force === "1";

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id parameter is required",
      });
    }

    await service.deleteLeaveType(parseInt(id, 10), { force });
    res.status(200).json({
      success: true,
      message: "Leave type deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
