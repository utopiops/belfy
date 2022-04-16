const express = require("express");
const router = express.Router();

const { handler: create } = require("./create");

router.post("/", create);

module.exports = router;
