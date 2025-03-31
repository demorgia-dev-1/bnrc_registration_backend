const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Submission = require("../models/Submission");
const Form = require("../models/FormSchema");
const mongoose = require("mongoose");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create-order/:submissionId", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const submission = await Submission.findById(
      req.params.submissionId
    ).session(session);
    if (!submission) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Submission not found" });
    }

    const form = await Form.findById(submission.form).session(session);
    if (!form) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Form not found" });
    }

    if (!form.paymentRequired) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Payment is not required for this form" });
    }

    const options = {
      amount: form.paymentDetails.amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    submission.paymentDetails = {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    };

    submission.paymentStatus = "Pending";

    await submission.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating Razorpay order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/webhook", express.json(), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  try {
    const hash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash === signature) {
      const event = req.body;
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;

      const submission = await Submission.findOne({
        "paymentDetails.order_id": orderId,
      });

      if (!submission) {
        console.log("No matching submission found for order:", orderId);
        return res.status(404).json({ message: "Submission not found" });
      }

      switch (event.event) {
        case "payment.captured":
          submission.paymentStatus = "Completed";
          break;

        case "payment.failed":
          submission.paymentStatus = "Failed";
          break;

        case "payment.authorized":
          submission.paymentStatus = "Authorized";
          break;

        case "order.paid":
          submission.paymentStatus = "Completed";
          break;

        default:
          submission.paymentStatus = "Pending";
      }

      submission.paymentDetails.payment_id = paymentId;
      await submission.save();

      return res.status(200).json({ status: "ok" });
    } else {
      return res.status(400).json({ status: "Invalid signature" });
    }
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return res.status(500).json({ status: "Webhook error" });
  }
});


module.exports = router;
