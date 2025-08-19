const express = require('express');
const auth = require("../auth")
router = express.Router();
const {
    updateUser,
    setUser,
    loginUser,
    verifyUser,
    resetPassword,
    forgotPassword
} = require("../controllers/authController");


router.route("/reset_password").get(verifyUser);
router.route("/").post(auth,setUser);
router.route("/login").post(loginUser);
router.route("/update").put(updateUser);
router.route("/reset_password/:id").put(resetPassword);
router.route("/forgot_password").post(forgotPassword);

module.exports = router;
