
const Submission = require("../models/Submission");
const mongoose = require("mongoose");
const Form = require("../models/FormSchema");

exports.submitForm = async (req, res) => {
  try {
    console.log("=== REQUEST RECEIVED ===");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Files:", req.files);

    const { formId, ...rawResponses } = req.body;
    const files = req.files || [];

    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID format" });
    }

    const form = await Form.findById(formId).lean();
    if (!form) {
      return res.status(404).json({ success: false, message: "Form template not found" });
    }

    const responseData = {};
    form.fields.forEach((field) => {
      const fieldName = field.name;
      const fieldValue = rawResponses[fieldName];

      if (fieldValue !== undefined) {
        responseData[fieldName] = fieldValue;
      }
    });

    // === Validations ===
    const aadhaarRegex = /^\d{12}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    const validateSubmission = (fields, responses) => {
      const errors = {};
      fields.forEach(field => {
        const value = responses[field.name];

        if (field.required && (!value || value === "")) {
          errors[field.name] = `${field.label} is required.`;
          return;
        }

        if (field.type === "email" && value && !emailRegex.test(value)) {
          errors[field.name] = "Invalid email format.";
        }

        if (field.name.toLowerCase().includes("aadhaar") && value && !aadhaarRegex.test(value)) {
          errors[field.name] = "Aadhaar must be a 12-digit number.";
        }

        if (field.name.toLowerCase().includes("password") && value && !passwordRegex.test(value)) {
          errors[field.name] = "Password must be strong (uppercase, lowercase, digit, special char, min 8).";
        }

        if (field.name.toLowerCase().includes("contact") && value && !phoneRegex.test(value)) {
          errors[field.name] = "Invalid contact number.";
        }
      });

      return errors;
    };

    const validationErrors = validateSubmission(form.fields, responseData);
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
    }

    // Aadhaar uniqueness check per form
const aadhaarField = form.fields.find(f =>
  f.name.toLowerCase().includes("aadhaar")
);

if (aadhaarField) {
  const aadhaarValue = responseData[aadhaarField.name];

  if (aadhaarValue) {
    const existing = await Submission.findOne({
      form: formId,
      [`responses.${aadhaarField.name}`]: aadhaarValue
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar number has already been used in this form."
      });
    }
  }
}

    // === Save submission ===
    const submission = new Submission({
      form: formId,
      responses: responseData,
      uploadedFiles: files.map(file => ({
        fieldName: file.fieldname,
        originalName: file.originalname,
        path: file.path
      })),
      paymentStatus: "Pending",
      formSnapshot: {
        formName: form.formName,
        fields: form.fields.map(f => ({
          name: f.name,
          type: f.type,
          label: f.label
        }))
      }
    });

    await submission.save();

    return res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      submissionId: submission._id,
      data: submission.responses,
    });

  } catch (error) {
    console.error("SUBMISSION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save submission",
      error: error.message,
    });
  }
};

