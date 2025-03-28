

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
  },
  responses: {
    type: Object,
    required: true,
  },
  uploadedFiles: [
  {
    filename: String,
    fileId: mongoose.Schema.Types.ObjectId
  }
],

  paymentStatus: {
  type: String,
  enum: ["Pending", "Completed", "Failed", "Authorized"],
  default: undefined,
}
,
  paymentDetails: {
    amount: { type: Number }, 
    order_id: String,
    payment_id: String,
    signature: String,
  },
  formSnapshot: {
    formName: { type: String },
    fields: [{
      name: String,
      type: String,
      label: String
    }]
  }
}, { timestamps: true });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
