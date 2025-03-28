
const Form = require("../models/FormSchema");

const createForm = async (req, res) => {
    try {
        const { formName, startDate, endDate, status, paymentRequired, paymentDetails, fields } = req.body;

        const form = new Form({
            formName,
            startDate,
            endDate,
            status,
            paymentRequired,
            paymentDetails: paymentRequired ? paymentDetails : null,
            fields
        });

        await form.save();

        console.log(" Form saved:", form);
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
            paymentDetails: paymentRequired ? paymentDetails : null,
            fields: form.fields
          }
        });

    } catch (error) {
        console.error("Error creating form:", error);
        res.status(500).json({ message: "Error creating form", error });
    }
};

module.exports = { createForm };

