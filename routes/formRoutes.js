const express = require("express");
const Form = require("../models/FormSchema");
const Submission = require("../models/Submission");
const Razorpay = require("razorpay");
const path = require("path");
const router = express.Router();
const connectStorage = require("../middlewares/upload");
const mongoose = require("mongoose");
const authenticateToken = require("../middlewares/authentication")

const generatePlaceholder = (field) => {
  switch (field.type) {
    case "text":
      return `Enter ${field.label.toLowerCase()}`;
    case "email":
      return "example@email.com";
    case "number":
      return `Enter a number${field.min ? ` (min: ${field.min})` : ""}${
        field.max ? ` (max: ${field.max})` : ""
      }`;
    case "date":
      return "YYYY-MM-DD";
    case "select":
    case "radio":
      return "Select an option";
    case "checkbox":
      return "";
    case "file":
      return "Choose file";
    default:
      return "";
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/check-aadhaar", async (req, res) => {
  try {
    const { formId, aadhaar } = req.body;

    if (!aadhaar) return res.json({ exists: false });

    const existing = await Submission.findOne({
      form: formId,
      $or: [
        { "responses.aadhaar": aadhaar },
        { "responses.aadhar": aadhaar },
        { "responses.adhar": aadhaar },
      ]
    });

    if (existing) return res.json({ exists: true });

    return res.json({ exists: false });
  } catch (error) {
    console.error("Error checking Aadhaar:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    const { formId, email } = req.body;

    const existing = await Submission.findOne({
      form: formId,
      $or: [
        { "responses.email": email },
        { "responses.Email": email },
        { "responses.e_mail": email }
      ]
    });

    if (existing) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking email uniqueness:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/submit-form/:formId", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const upload = await connectStorage();

    upload.array("files", 5)(req, res, async (err) => {
      if (err) {
        console.error("Upload error:", err);
        return res
          .status(500)
          .json({ message: "Upload error", error: err.message });
      }

      try {
        const { formId } = req.params;
        const responses = JSON.parse(req.body.responses);

        const uploadedFiles = req.files
  .filter((file) => file.id || file._id)
  .map((file) => ({
    filename: file.filename,
    fileId: file.id || file._id,
    fieldName: file.fieldname,
    originalName: file.originalname,
  }));


        const form = await Form.findById(formId).session(session);
        if (!form) {
          await session.abortTransaction();
          return res.status(404).json({ message: "Form not found" });
        }
        const submission = new Submission({
          form: formId,
          responses,
          uploadedFiles,
        });

        await submission.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
          message: "Form submitted successfully",
          submission,
          paymentRequired: form.paymentRequired,
        });
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error submitting form:", error);
        res.status(500).json({ message: "Internal Server Error", error });
      }
    });
  } catch (err) {
    session.endSession();
    console.error("Upload middleware setup failed:", err);
    res
      .status(500)
      .json({
        message: "Internal server error during upload setup",
        error: err.message,
      });
  }
});

router.get("/forms/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });

    res.status(200).json(form);
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// Extend form end date
router.put("/forms/:formId/extend", authenticateToken, async (req, res) => {
  const { formId } = req.params;
  const { newEndDate } = req.body;

  if (!newEndDate)
    return res.status(400).json({ message: "New end date is required" });

  try {
    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { endDate: new Date(newEndDate) },
      { new: true }
    );

    if (!updatedForm)
      return res.status(404).json({ message: "Form not found" });

    res.status(200).json({
      message: "Form end date extended successfully",
      form: updatedForm,
    });
  } catch (error) {
    console.error("Error extending form end date:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// Create new form
router.post("/create-form", authenticateToken, async (req, res) => {
  try {
    const {
      formName,
      startDate,
      endDate,
      status,
      paymentRequired,
      paymentDetails,
      fields,
    } = req.body;

    const form = new Form({
      formName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      paymentRequired,
      paymentDetails: paymentRequired
        ? {
            amount: paymentDetails.amount,
            order_id: null,
            payment_id: null,
            signature: null,
          }
        : null,

      fields: fields.map((field) => ({
        ...field,
        name: field.label.toLowerCase().replace(/\s+/g, "_"),
        placeholder: generatePlaceholder(field),
        options: field.options || [],
        minLength: field.minLength || undefined,
        maxLength: field.maxLength || undefined,
      })),
    });

    await form.save();

    res.status(201).json({
      message: "Form saved successfully",
      formId: form._id,
      form: {
        _id: form._id,
        formName: form.formName,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        paymentRequired: form.paymentRequired,
        paymentDetails: form.paymentDetails,
        fields: form.fields,
      },
    });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({
      message: "Error creating form",
      error: error.message,
    });
  }
});

module.exports = router;
