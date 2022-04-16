const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../../../middlewares/getProviderV2");

const {
  handler: listEc2IamRolesByEnvName,
} = require("./listEc2IamRolesByEnvName");

router.get(
  "/listEc2IamRolesByEnvName/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listEc2IamRolesByEnvName
);

module.exports = router;