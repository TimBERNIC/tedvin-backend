// Import des packages
const express = require("express");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utils/convertToBase64");
// import des middlewares

const isAuthenticated = require("../middleware/isAuthenticated");

// import des models
const Offer = require("../models/Offer");
const User = require("../models/User");
// Usage des routes
const router = express.Router();

// CREATE
// Création d'une offre
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // Destructuration de req.body
      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      // Limitation

      if (title.length > 50) {
        return res
          .status(404)
          .json({ message: "Title length is not available" });
      }

      if (description.length > 500) {
        return res
          .status(404)
          .json({ message: "Description length is not available" });
      }

      if (price > 100000) {
        return res
          .status(404)
          .json({ message: "Price is not Available, too High" });
      }

      // Création de l'objet dans la base de donnée

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          { ETAT: condition },
          { EMPLACEMENT: city },
          { MARQUE: brand },
          { TAILLE: size },
          { COULEUR: color },
        ],
        product_image: undefined,
        owner: req.user,
      });
      // encodage de la picture
      const convertedFiles = convertToBase64(req.files.picture);
      // envoi vers cloudinary
      const cloudinaryResponse = await cloudinary.uploader.upload(
        convertedFiles,
        { folder: `Tedvin/offer/${newOffer.id}` }
      );
      newOffer.product_image = cloudinaryResponse;
      await newOffer.save();

      const returnObject = {
        _id: newOffer.id,
        product_description: newOffer.product_description,
        product_price: newOffer.product_price,
        product_details: newOffer.product_details,
        owner: {
          account: newOffer.owner.account.username,
          avatar: newOffer.owner.account.avatar,
          _id: newOffer.owner._id,
        },
        product_image: newOffer.product_image,
      };

      return res.status(200).json(returnObject);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);
// READ

router.get("/offers", async (req, res) => {
  try {
    // filtre par query possible
    const filter = {};

    if (req.query.title) {
      filter.product_name = new RegExp(req.query.title, "i");
    }

    let sort = "asc";

    if (req.query.sort) {
      sort = req.query.sort.replace("price-", "");
    }

    // autre version
    // si filtre priceMin
    if (req.query.priceMin) {
      filter.product_price = { $gte: req.query.priceMin };
    }
    // Si filtre priceMax
    if (req.query.priceMax) {
      // et que aucune key product_price
      if (filter.product_price) {
        filter.product_price.$lte = req.query.priceMax;
      } else {
        //Sinon
        filter.product_price = { $lte: req.query.priceMax };
      }
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limitPerPage = 5;
    const offers = await Offer.find(filter)
      .sort({ product_price: sort })
      .limit(limitPerPage)
      .skip((page - 1) * limitPerPage)
      .select("product_name product_price -_id");

    return res.status(200).json(offers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/offers/:id", async (req, res) => {
  try {
    const foundOfferById = await Offer.findById(req.params.id).populate(
      "owner"
    );

    return res.status(200).json(foundOfferById);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
// UPDATE

router.put("/offer/update", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    // retrouver l'offre

    const foundOffer = await Offer.findById(req.query.id);

    if (!foundOffer) {
      return res.status(404).json({ message: "Not Found" });
    } else {
      if (req.body.title) {
        foundOffer.product_name = req.body.title;
      }
      if (req.body.description) {
        foundOffer.product_description = req.body.description;
      }
      if (req.body.price) {
        foundOffer.product_price = req.body.price;
      }
      if (req.body.condition) {
        foundOffer.product_details[0].ETAT = req.body.condition;
        foundOffer.markModified("product_details");
      }

      if (req.body.city) {
        foundOffer.product_details[1] = req.body.city;
        foundOffer.markModified("product_details");
      }
      if (req.body.brand) {
        foundOffer.product_details[2].MARQUE = req.body.brand;
        foundOffer.markModified("product_details");
      }
      if (req.body.size) {
        foundOffer.product_details[3].TAILLE = req.body.size;
        foundOffer.markModified("product_details");
      }
      if (req.body.color) {
        foundOffer.product_details[4].COULEUR = req.body.color;
        foundOffer.markModified("product_details");
      }
      if (req.files) {
        // supression sur cloudinary de l'image
        await cloudinary.uploader.destroy(foundOffer.product_image.public_id);
        // nettoyage de la BDD
        foundOffer.product_image = {};
        // post de la nouvelle image sur cloudinary
        const newConvertedFiles = convertToBase64(req.files.picture);
        const cloudinaryResponse = await cloudinary.uploader.upload(
          newConvertedFiles,
          { folder: `Tedvin/offer/${foundOffer.id}` }
        );
        // Push dans la BDD
        foundOffer.product_image = cloudinaryResponse;
      }

      await foundOffer.save();
      return res.status(201).json(foundOffer);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const foundOffer = await Offer.findById(req.params.id).populate("owner");
    if (req.user.token === foundOffer.owner.token) {
      await cloudinary.uploader.destroy(foundOffer.product_image.public_id);
      await cloudinary.api.delete_folder(`Tedvin/offer/${req.params.id}`);
      await Offer.deleteOne({ _id: req.params.id });
      return res.status(200).json({ message: "Object delete" });
    } else {
      return res.status(401).json({ message: "Unauthorized action" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
module.exports = router;
