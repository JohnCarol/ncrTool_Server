const express = require("express");
router = express.Router();
const auth = require("../auth")
const { upload } = require("../utils/fileUpload");

const {
    getTrends, getStatusDistribution, getRecentNcrs, getAllNcrs, getNcr, saveNcr, updateNcrDisposition, notifyUser } = require("../controllers/ncrController");

router.post("/save", auth, upload.array("attachments", 10), saveNcr)
router.put("/update", auth, upload.array("attachments", 10), saveNcr)
router.route("/viewncr").get(auth, getNcr);
router.route("/trends").get(auth, getTrends);
router.route("/statusdistribution").get(auth, getStatusDistribution);
router.route("/recentncrs").get(auth, getRecentNcrs);
router.route("/allncrs").get(auth, getAllNcrs);
router.route("/updatedisposition").put(auth, updateNcrDisposition);
router.route("/notify_user").post(auth, notifyUser);



module.exports = router;