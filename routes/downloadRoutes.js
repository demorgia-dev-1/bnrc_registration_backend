const express = require("express");
const ExcelJS = require("exceljs");
const Form = require("../models/FormSchema");
const Submission = require("../models/Submission");
const { GridFSBucket } = require("mongodb");
const streamToBuffer = require("stream-to-buffer");
const fs = require("fs");
const mongoose = require("mongoose");
const authenticateToken = require("../middlewares/authentication");

const router = express.Router();

router.get("/forms-excel", authenticateToken, async (req, res) => {
  try {
    const forms = await Form.find();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Forms");

    const allFieldLabels = new Set();
    forms.forEach((form) => {
      form.fields.forEach((field) => allFieldLabels.add(field.label));
    });

    const fieldColumns = Array.from(allFieldLabels);

    worksheet.addRow([
      "Form ID",
      "Form Name",
      "Start Date",
      "End Date",
      "Status",
      "Payment Required",
      "Amount",
      ...fieldColumns,
    ]);

    forms.forEach((form) => {
      const fieldMap = {};
      form.fields.forEach((field) => {
        fieldMap[field.label] = "Yes";
      });

      const row = [
        form._id.toString(),
        form.formName,
        form.startDate ? new Date(form.startDate).toLocaleDateString() : "N/A",
        form.endDate ? new Date(form.endDate).toLocaleDateString() : "N/A",
        form.status,
        form.paymentRequired ? "Yes" : "No",
        form.paymentDetails?.amount || "N/A",
        ...fieldColumns.map((label) => fieldMap[label] || ""),
      ];

      worksheet.addRow(row);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=all-forms.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating forms Excel:", error);
    res.status(500).send("Error generating Excel file");
  }
});

router.get("/submissions-excel", authenticateToken, async (req, res) => {
  try {
    const submissions = await Submission.find().populate("form");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Submissions");

    const allFields = new Set();
    submissions.forEach((sub) => {
      if (sub.responses) {
        Object.keys(sub.responses).forEach((key) => allFields.add(key));
      }
    });

    const responseFields = Array.from(allFields);

    worksheet.addRow([
      "Submission ID",
      "Form Name",
      ...responseFields,
      "Payment Status",
      "Image File Name",
    ]);

    for (let sub of submissions) {
      const file = sub.uploadedFiles?.[0];

      const fileFieldName =
        file?.fieldName || file?.metadata?.fieldName || "Unnamed Field";
      const originalFileName =
        file?.originalName ||
        file?.metadata?.originalname ||
        file?.filename ||
        "Unknown File";

      const fileName = `${fileFieldName} (${originalFileName})`;

      worksheet.addRow([
        sub._id.toString(),
        sub.form?.formName || "N/A",
        ...responseFields.map((key) => sub.responses?.[key] || ""),
        sub.paymentStatus || "Pending",
        fileName,
      ]);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=all-submissions.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating submissions Excel:", error);
    res.status(500).send("Error generating Excel");
  }
});

module.exports = router;
