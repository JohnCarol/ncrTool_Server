const express = require("express");
router = express.Router();
const auth = require("../auth")

const {
 getUser,
 getUsers,
 getReviewUsers
} = require("../controllers/userController");

router.route("/getusers").get(auth,getUsers);
router.route("/").get(auth,getUser);
router.route("/getuser").get(auth,getUser);
router.route("/getreviewusers").get(auth,getReviewUsers);


module.exports = router;