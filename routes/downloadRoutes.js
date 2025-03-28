const express = require("express");
const ExcelJS = require("exceljs");
const Form = require("../models/FormSchema");
const Submission = require("../models/Submission");
const { GridFSBucket } = require("mongodb");
const streamToBuffer = require("stream-to-buffer");
const fs = require("fs");
const mongoose = require('mongoose')

const router = express.Router();

// 🔸 Route: Download All Forms in Excel
router.get("/forms-excel", async (req, res) => {
    try {
      const forms = await Form.find();
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Forms");
  
      // Collect all unique field labels across all forms
      const allFieldLabels = new Set();
      forms.forEach(form => {
        form.fields.forEach(field => allFieldLabels.add(field.label));
      });
  
      const fieldColumns = Array.from(allFieldLabels);
  
      // Header row
      worksheet.addRow([
        "Form ID",
        "Form Name",
        "Start Date",
        "End Date",
        "Status",
        "Payment Required",
        "Amount",
        ...fieldColumns
      ]);
  
      // Data rows
      forms.forEach((form) => {
        const fieldMap = {};
        form.fields.forEach(field => {
          fieldMap[field.label] = "Yes"; // You can put "Yes", "Present", or just the field label
        });
  
        const row = [
          form._id.toString(),
          form.formName,
          form.startDate ? new Date(form.startDate).toLocaleDateString() : "N/A",
          form.endDate ? new Date(form.endDate).toLocaleDateString() : "N/A",
          form.status,
          form.paymentRequired ? "Yes" : "No",
          form.paymentDetails?.amount || "N/A",
          ...fieldColumns.map(label => fieldMap[label] || "")
        ];
  
        worksheet.addRow(row);
      });
  
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=all-forms.xlsx");
  
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating forms Excel:", error);
      res.status(500).send("Error generating Excel file");
    }
  });
  

// 🔸 Route: Download All Submissions in Excel
// router.get("/submissions-excel", async (req, res) => {
//   try {
//     const submissions = await Submission.find().populate("form");

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("Submissions");

//     const allFields = new Set();
//     submissions.forEach((sub) => {
//       Object.keys(sub.responses).forEach(key => allFields.add(key));
//     });

//     const headers = ["Submission ID", "Form Name", ...Array.from(allFields), "Payment Status"];
//     worksheet.addRow(headers);

//     submissions.forEach((sub) => {
//       const row = [
//         sub._id.toString(),
//         sub.form?.formName || "N/A",
//         ...Array.from(allFields).map(key => sub.responses[key] || ""),
//         sub.paymentStatus || "Pending"
//       ];
//       worksheet.addRow(row);
//     });

//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.setHeader("Content-Disposition", "attachment; filename=all-submissions.xlsx");

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error("Error generating submissions Excel:", error);
//     res.status(500).send("Error generating Excel file");
//   }
// });

router.get("/submissions-excel", async (req, res) => {
  try {
    const submissions = await Submission.find().populate("form");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Submissions");

    const allFields = new Set();
    submissions.forEach((sub) => {
      Object.keys(sub.responses).forEach((key) => allFields.add(key));
    });

    const responseFields = Array.from(allFields);

    // Header
    worksheet.addRow([
      "Submission ID",
      "Form Name",
      ...responseFields,
      "Payment Status",
      "Image File Name"
    ]);

    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    for (let [index, sub] of submissions.entries()) {
      const rowIndex = index + 2;

      const file = sub.uploadedFiles?.[0];

      const fileFieldName = file?.fieldName || file?.metadata?.fieldName || "Unnamed Field";
      const originalFileName = file?.originalName || file?.metadata?.originalname || file?.filename || "Unknown File";
      
      const fileName = `${fileFieldName} (${originalFileName})`;
      

      
        
              // Add submission row
              worksheet.addRow([
                sub._id.toString(),
                sub.form?.formName || "N/A",
                ...responseFields.map((key) => sub.responses[key] || ""),
                sub.paymentStatus || "Pending",
                fileName
              ]);
              

      // Add submission row
      worksheet.addRow([
        sub._id.toString(),
        sub.form?.formName || "N/A",
        ...responseFields.map((key) => sub.responses[key] || ""),
        sub.paymentStatus || "Pending",
        fileName
      ]);

      try {
        if (!file || !file.fileId) continue;

        const { ObjectId } = require("mongodb");
        const fileId = typeof file.fileId === "string" ? new ObjectId(file.fileId) : file.fileId;

        const downloadStream = bucket.openDownloadStream(fileId);
        const buffer = await new Promise((resolve, reject) => {
          streamToBuffer(downloadStream, (err, buf) => {
            if (err) return reject(err);
            resolve(buf);
          });
        });

        const ext = (file.metadata?.originalname || file.filename || "jpg").split(".").pop().toLowerCase();

        if (!["jpg", "jpeg", "png"].includes(ext)) {
          console.warn(`⚠️ Skipping non-image file (${ext})`);
          continue;
        }

        const imageId = workbook.addImage({
          buffer,
          extension: ext,
        });

        worksheet.addImage(imageId, {
          tl: { col: responseFields.length + 5, row: rowIndex - 1 },
          ext: { width: 100, height: 100 },
        });
      } catch (imgErr) {
        console.error(`❌ Error adding image for submission ${sub._id}:`, imgErr.message);
      }
    }

    // Only write workbook after all rows are processed
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=all-submissions.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("❌ Error generating submissions Excel:", error);
    res.status(500).send("Error generating Excel with images");
  }
});



module.exports = router;
