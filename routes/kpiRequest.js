const express = require("express");
router = express.Router();
const auth = require("../auth")

const {
    getKpis
} = require("../controllers/kpiController");

router.route("/getkpis").get(auth,getKpis);

module.exports = router;