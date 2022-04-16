const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV4,
} = require("../../../../middlewares/getProviderV4");

const {
  handler: listAutoScalingGroupInstances,
} = require("./listAutoScalingGroupInstances");

router.post(
  "/listAutoScalingGroupInstances",
  getProviderWithCredentialsV4({ bodyParam: "environmentName" }),
  listAutoScalingGroupInstances
);

module.exports = router;
