const express = require("express");
router = express.Router();
const auth = require("../auth")

const { getAttachments, downloadAttachment } = require("../controllers/attachmentsController");

router.route("/getattachments").get(auth, getAttachments);
router.route("/downloadattachment").get(auth, downloadAttachment);

module.exports = router;