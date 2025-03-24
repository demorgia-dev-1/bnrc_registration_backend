const Form = require("../models/Form");

const createForm = async (req, res) => {
  try {
    const { formName, startDate, endDate, status, paymentRequired, fields } = req.body;

    // ✅ Validation to prevent invalid data insertion
    if (!formName || !startDate || !endDate || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const defaultFields = [
      { label: "Full Name", name: "fullName", type: "text", required: true },
      { label: "Date of Birth", name: "dob", type: "date", required: true },
      { label: "Gender", name: "gender", type: "select", required: true, options: ["Male", "Female", "Other"] },
      { label: "Aadhaar Number", name: "aadhaar", type: "text", required: true },
      { label: "Contact Number", name: "contact", type: "tel", required: true },
      { label: "Email ID", name: "email", type: "email", required: true },
      { label: "Address (Permanent)", name: "permanentAddress", type: "text", required: true },
      { label: "Address (Correspondence)", name: "correspondenceAddress", type: "text", required: true }
    ];

    const combinedFields = [...defaultFields, ...fields];

    const form = new Form({
      formName,
      startDate,
      endDate,
      status,
      paymentRequired,
      fields: combinedFields
    });

    await form.save();
    console.log("Form saved:", form);

    res.status(201).json({ message: "Form created successfully", formId: form._id.toString() });

  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({ message: "Error creating form", error });
  }
};

module.exports = { createForm };
