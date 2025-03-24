const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
  data: mongoose.Schema.Types.Mixed,
  paymentStatus: { type: String, default: "Pending" },
  uploadedFiles: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Submission", submissionSchema);
