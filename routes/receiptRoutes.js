
const express = require("express");
const PDFDocument = require("pdfkit");
const Submission = require("../models/Submission");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const router = express.Router();
const axios = require("axios");

router.get("/receipt/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.findById(submissionId).populate("form");

    if (!submission) return res.status(404).send("Submission not found");

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");

    doc.pipe(res);

    doc.fontSize(20).text("Form Submission Receipt", { align: "center" }).moveDown();
    doc.fontSize(14).text(`Form: ${submission.form.formName}`);
    doc.text(`Submission ID: ${submission._id}`);
    doc.text(`Date: ${new Date(submission.createdAt).toLocaleString()}`);

    if (submission.form.paymentRequired && submission.paymentStatus) {
      doc.text(`Payment Status: ${submission.paymentStatus}`);
    }

    doc.moveDown();

    doc.fontSize(16).text("Submitted Details", { underline: true }).moveDown();
    for (const [key, value] of Object.entries(submission.responses)) {
      doc.fontSize(12).text(`${key.replace(/_/g, " ")}: ${value}`);
    }

    doc.moveDown();

    // Show uploaded image files
    if (submission.uploadedFiles && submission.uploadedFiles.length > 0) {
      doc.addPage().fontSize(16).text("Uploaded Photos", { underline: true }).moveDown();

      for (const file of submission.uploadedFiles) {
        const fileUrl = `http://localhost:5000/api/file/${file.filename}`;

        try {
          // Fetch image as buffer
          const imageRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
          const imgBuffer = Buffer.from(imageRes.data, "binary");

          doc.image(imgBuffer, {
            fit: [400, 400],
            align: "center",
            valign: "center"
          });

          doc.moveDown();
        } catch (err) {
          doc.fontSize(12).text(`Could not load image: ${file.filename}`);
        }
      }
    }

    doc.end();
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).send("Server error");
  }
});

module.exports = router;

