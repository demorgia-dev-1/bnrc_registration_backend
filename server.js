
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const formRoutes = require("./routes/formRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Use CORS middleware
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Body Parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/bnrc_registration";
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });

app.use("/api", formRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
