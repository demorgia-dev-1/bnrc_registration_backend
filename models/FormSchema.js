const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  label: { type: String, required: true },      
  name: { type: String, required: true },      
  type: { type: String, required: true },         
  required: { type: Boolean, default: false },   

  // Validation Rules
  minLength: { type: Number },                   
  maxLength: { type: Number },                     
  min: { type: Number },                          
  max: { type: Number },                          
  pattern: { type: String },                     
  dateMin: { type: Date },                        
  dateMax: { type: Date },                         

  // For dropdown fields
  options: [{ type: String }]
});

const formSchema = new mongoose.Schema({
  formName: { type: String, required: true },       
  startDate: { type: Date, required: true },        
  endDate: { type: Date, required: true },        
  status: { type: String, enum: ["Active", "Inactive"], required: true }, 
  paymentRequired: { type: Boolean, default: false },
  paymentDetails: {
    amount: { type: Number }, 
  order_id: { type: String },
  payment_id: { type: String },
  signature: { type: String },
},

  fields: [fieldSchema]                     
}, { timestamps: true });



// Submission Schema
const submissionSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  responses: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
  uploadedFiles: [{
    fieldName: String,
    originalName: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  paymentStatus: { type: String, default: "Pending", enum: ["Pending", "Completed", "Failed"] },
  formSnapshot: {
    formName: String,
    fields: [{ name: String, type: String, label: String }]
  }
}, { timestamps: true });

const Form = mongoose.model("Form", formSchema);
module.exports = Form;

