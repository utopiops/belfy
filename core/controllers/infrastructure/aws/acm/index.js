const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../../../middlewares/getProviderV2");

const {
  handler: listCertificatesByEnvironmentName,
} = require("./listCertificatesByEnvironmentName");

const {
  handler: listCertificatesStatus,
} = require("./listCertificatesStatus");

router.get(
  "/listCertificatesByEnvironmentName/:environmentName",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listCertificatesByEnvironmentName
);

router.get(
  "/environment/name/:environmentName/listCertificatesStatus",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listCertificatesStatus
);

module.exports = router;