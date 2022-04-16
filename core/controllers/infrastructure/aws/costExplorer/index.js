const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../../../middlewares/getProviderV2");

const { handler: getTotalCostAndUsage } = require("./getCostAndUsage");
const { handler: getCostAndUsageByTags } = require("./getCostAndUsageByTags");
const { handler: getEnvironmentCosts } = require("./getEnvironmentCosts");
const { handler: getApplicationCosts } = require("./getApplicationCosts");

router.post(
  "/getCostAndUsage/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getTotalCostAndUsage
);

router.post(
  "/getCostAndUsage/by_tags/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getCostAndUsageByTags
);

router.post(
  "/getEnvironmentCosts/environment/name/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getEnvironmentCosts
);

router.post(
  "/getApplicationCosts/environment/name/:environmentName/application/name/:applicationName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getApplicationCosts
);

module.exports = router;