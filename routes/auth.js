const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// SIGNUP - create user
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    let existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({ email, password: hashed });
    await user.save();

    return res.status(201).json({ msg: "User created" });
  } catch (error) {
    return res.status(500).json({ msg: "Server error" });
  }
});

// LOGIN - authenticate user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Email not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    return res.json({ token, email });
  } catch (error) {
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
