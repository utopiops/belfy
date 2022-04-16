const express = require("express");
const router = express.Router();
const aws = require("./aws");

router.use("/aws", aws);

module.exports = router;
