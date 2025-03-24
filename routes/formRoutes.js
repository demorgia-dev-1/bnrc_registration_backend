const express = require("express");
const router = express.Router();
const Form = require("../models/FormSchema");
const Submission = require("../models/Submission");
const upload = require("../middlewares/upload");

router.get("/:id", async (req, res) => {
    const { id } = req.params;
  
    try {
      const form = await Form.findById(id);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
  
      res.status(200).json(form);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Server error", error });
    }
  });

// Create Form
router.post("/create-form", async (req, res) => {
  try {
    const { formName, startDate, endDate, status, paymentRequired, fields } = req.body;

    const newForm = new Form({
      formName,
      startDate,
      endDate,
      status,
      paymentRequired,
      fields,
    });

    await newForm.save();
    res.status(201).json({ message: "Form saved successfully", form: newForm });
  } catch (error) {
    res.status(500).json({ message: "Error creating form", error });
  }
});

router.get("/forms", async (req, res) => {
  const forms = await Form.find();
  res.json(forms);
});

// Submit Form with File Uploads
router.post("/submit-form/:formId", upload.array("files", 5), async (req, res) => {
  try {
    const uploadedFiles = req.files.map(file => file.path);
    const formData = req.body;

    const submission = new Submission({
      formId: req.params.formId,
      data: formData,
      uploadedFiles,
      paymentStatus: "Pending",
    });

    await submission.save();
    res.status(201).json({ message: "Form submitted successfully", submission });
  } catch (error) {
    res.status(500).json({ message: "Error submitting form", error });
  }
});

module.exports = router;
