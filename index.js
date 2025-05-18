// recupération des packages
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

// utilisation des packages
const app = express();
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGODB_URL);

// récupération des voies
const userRoute = require("./routes/User");
const offerRoute = require("./routes/Offer");

// Cloudinary registration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// appel des route
app.use(userRoute);
app.use(offerRoute);

// Routes initiales
app.get("/", (req, res) => {
  try {
    return res.status(200).json("Welcome to the Vinted's Server!");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.all(/.*/, (req, res) => {
  return res.status(404).json({ message: "Not Found" });
});
// ouverture du serveur
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("TEDVIN's Server Launch !! 👖👕👗👘 on port:" + port);
});
