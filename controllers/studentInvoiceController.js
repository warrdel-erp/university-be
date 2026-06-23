import * as invoice from "../services/studentInvoiceService.js";

export async function getStudentCount(req, res) {
  let { type } = req.query;
  try {
    if (!type || type.trim() === "") {
      type = "total";
    }

    const studentCount = await invoice.getStudentCount(type);
    res.status(200).json({ message: "count", studentCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function activeInvoice(req, res) {
  const data = req.body;
  try {
    const feePlans = await invoice.updateInvoices(data);
    res.status(200).json(feePlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function addStudentSpecificInvoice(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  const data = req.body;
  try {
    const feePlans = await invoice.addStudentSpecificInvoice(createdBy, updatedBy, data);
    res.status(200).json(feePlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllActiveInvoice(req, res) {
  try {
    const getAllActive = await invoice.getAllActiveInvoice();
    if (getAllActive) {
      res.status(200).json(getAllActive);
    } else {
      res.status(404).json({ message: "active all not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
