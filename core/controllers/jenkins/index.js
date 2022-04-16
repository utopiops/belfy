const express = require("express");
const router = express.Router();

const { handler: saveBuildInfo } = require('./saveBuildInfo');

// Save build history. internal use only.
router.post("/build/save", saveBuildInfo);

module.exports = router;