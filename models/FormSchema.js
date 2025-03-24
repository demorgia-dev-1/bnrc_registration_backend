const mongoose = require("mongoose");

// Schema for form fields
const fieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  required: { type: Boolean, default: false }
});

// Form Schema
const formSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["Active", "Inactive"], required: true },
  paymentRequired: { type: Boolean, default: false },
  fields: [fieldSchema]
}, { timestamps: true });

const Form = mongoose.model("Form", formSchema);
module.exports = Form;
