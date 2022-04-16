const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV4,
} = require("../../../../middlewares/getProviderV4");

const { handler: listServiceTasks } = require("./listServiceTasks");
const { handler: stopTask } = require("./stopTask");

router.post(
  "/listServiceTasks",
  getProviderWithCredentialsV4({ bodyParam: "environmentName" }),
  listServiceTasks
);
router.post(
  "/stopTask",
  getProviderWithCredentialsV4({ bodyParam: "environmentName" }),
  stopTask
);

module.exports = router;
