const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const DEFAULT_ADMIN = {
    email: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD
  };

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
      const token = jwt.sign({ adminId: "default" }, process.env.JWT_SECRET , {
        expiresIn: "1d"
      });

      return res.status(200).json({ message: "Login successful (default admin)", token });
    }
    res.status(401).json({ message: "invalid username or password"});
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
