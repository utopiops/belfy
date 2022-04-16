const { handleRequest } = require("../../../helpers");
const QueueService = require("../../../../queue");
const { config } = require("../../../../utils/config");

const appQueName = config.queueName;

async function create(req, res) {
  // TODO: add validation for req.body
  const handle = async () => {
    const { userId } = res.locals;

    // send a message with the topic ....
    const message = {
      jobType: "create_k8s_mongodb",
      jobDetails: {
        userId,
        details: req.body,
      },
    };
    await QueueService.sendMessage(appQueName, message);
    return {
      success: true,
    };
  };
  await handleRequest({ req, res, handle });
}

exports.handler = create;
