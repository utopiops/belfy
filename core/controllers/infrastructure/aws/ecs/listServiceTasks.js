const { handleRequest } = require("../../../helpers");
const { getEcs } = require("./getEcs");
const { handleAwsRequest } = require("../helpers");
const yup = require("yup");

async function listServiceTasks(req, res) {
  const validationSchema = yup.object().shape({
    cluster: yup.string().required(),
    serviceName: yup.string().required(),
  });
  const handle = async () => {
    const { cluster, serviceName } = req.body;

    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const ecs = await getEcs(baseConfig);

    const taskArnsFn = () => ecs.listTasks({ cluster, serviceName }).promise();
    const taskArnsResponse = await handleAwsRequest({ fn: taskArnsFn });
    if (!taskArnsResponse.success) return taskArnsResponse;

    const taskArns = taskArnsResponse.outputs.taskArns;

    if (!taskArns || !taskArns.length) {
      res.status(constants.statusCodes.ok).send([]);
      return;
    } else {
      // each task arn is something like this:
      // "arn:aws:ecs:us-east-1:994147050565:task/a3ebbf3f-c2c8-461b-a8de-c2ae455a/2ad2cabe91d94e76856c7b207c3fb590"
      // we should extract the last part of the ARN to get the task IDs
      const tasks = taskArns.map((t) => t.split(":task/")[1]);

      const taskDetailsFn = () =>
        ecs.describeTasks({ cluster, tasks }).promise();
      return await handleAwsRequest({ fn: taskDetailsFn });
    }
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = listServiceTasks;
