const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../../../middlewares/getProviderV2");
const {
  getProviderWithCredentialsV4,
} = require("../../../../middlewares/getProviderV4");

const { handler: terminateInstance } = require("./terminateInstance");
const { handler: stopInstance } = require("./stopInstance");
const { handler: listEc2KeyPairsByEnvName } = require("./listEc2KeyPairsByEnvName");


router.post(
  "/terminateInstance",
  getProviderWithCredentialsV4({ bodyParam: "environmentName" }),
  terminateInstance
);

router.post(
  "/stopInstance",
  getProviderWithCredentialsV4({ bodyParam: "environmentName" }),
  stopInstance
);

router.get(
  "/listEc2KeyPairsByEnvName/:environmentName",
  getProviderWithCredentialsV4({ routeParam: "environmentName" }),
  listEc2KeyPairsByEnvName
);




// the two following routes only exist for backwards compatibility
router.post(
  "/environment/name/:environmentName/terminateInstance",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  terminateInstance
);

router.post(
  "/environment/name/:environmentName/stopInstance",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  stopInstance
);

module.exports = router;
