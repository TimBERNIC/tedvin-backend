// récupération des packages
const express = require("express");
const mongoose = require("mongoose");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64");
const cloudinary = require("cloudinary").v2;

// utilisation de Router
const router = express.Router();

// récupération des modèles
const User = require("../models/User");

// CRUD
// Create
// Create New Acccount
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ message: "missing parameters" });
    } else {
      const foundAccountWithEmail = await User.findOne({ email: email });
      if (foundAccountWithEmail) {
        return res
          .status(409)
          .json({ message: "email account already register" });
      } else {
        const newSalt = uid2(24);
        const newHash = SHA256(password + newSalt).toString(encBase64);
        const newToken = uid2(36);

        const newUser = new User({
          email: req.body.email,
          account: {
            username: username,
            avatar: undefined,
          },
          newsletter: newsletter,
          token: newToken,
          hash: newHash,
          salt: newSalt,
        });
        // ajout de l'Avatar
        const encodedAvatar = convertToBase64(req.files.avatar);
        const cloudinaryResponse = await cloudinary.uploader.upload(
          encodedAvatar,
          { folder: `Tinved/user/${newUser._id}` }
        );
        newUser.account.avatar = cloudinaryResponse;

        await newUser.save();
        const responseObject = {
          _id: newUser._id,
          token: newUser.account.token,
          account: newUser.account,
        };
        return res.status(201).json(responseObject);
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/user/login", async (req, res) => {
  try {
    const foundAccount = await User.findOne({ email: req.body.email });
    if (!foundAccount) {
      return res.status(401).json({ message: "Invalid email or password" });
    } else {
      const loginHash = SHA256(req.body.password + foundAccount.salt).toString(
        encBase64
      );
      if (loginHash !== foundAccount.hash) {
        return res.status(401).json({ message: "Invalid email or password" });
      } else {
        const responseObject = {
          _id: foundAccount._id,
          token: foundAccount.token,
          account: foundAccount.account,
        };
        return res.status(201).json(responseObject);
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
// Read

// Update

// Delete
router.delete("/user/delete/:id", async (req, res) => {
  try {
    const foundUser = await User.findById(req.params.id);
    console.log(cloudinary.api);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }
    await User.findByIdAndDelete(req.params.id);
    await cloudinary.uploader.api.delete_folder(`Tinved/user`);
    return res.status(200).json({ message: "User delete success" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
// export

module.exports = router;
