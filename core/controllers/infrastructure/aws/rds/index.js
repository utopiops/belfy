const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../../../middlewares/getProviderV2");

const {
  handler: describeDbEngineVersions,
} = require("./describeDbEngineVersions");

const {
  handler: describeOrderableDBInstanceOptions,
} = require("./describeOrderableDBInstanceOptions");


router.post(
  "/describeDbEngineVersions/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  describeDbEngineVersions
);

router.post(
  "/describeOrderableDBInstanceOptions/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  describeOrderableDBInstanceOptions
);

module.exports = router;