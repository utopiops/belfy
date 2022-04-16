const { handleRequest } = require("../../../helpers");
const { getEcs } = require("./getEcs");
const { handleAwsRequest } = require("../helpers");
const yup = require("yup");

async function stopTask(req, res) {

  const validationSchema = yup.object().shape({
    cluster: yup.string().required(),
    task: yup.string().required(),
  });

  const handle = async () => {
    const { cluster, task } = req.body;
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const ecs = await getEcs(baseConfig);

    const fn = () => ecs.stopTask({ cluster, task }).promise();
    return await handleAwsRequest({ fn });
  };

  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = stopTask;
