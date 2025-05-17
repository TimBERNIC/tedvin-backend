// récupération des packages
const mongoose = require("mongoose");

// construction de modèle

const User = mongoose.model("User", {
  email: String,
  account: {
    username: String,
    avatar: Object,
  },
  newsletter: Boolean,
  token: String,
  hash: String,
  salt: String,
});

// export
module.exports = User;
