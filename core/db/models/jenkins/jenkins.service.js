const ApplicationModel = require('../application/application');
const { runQueryHelper } = require('../helpers');

exports.saveBuildInfo = saveBuildInfo;


async function saveBuildInfo(environmentId, applicationName, history) {
  const runQuery = async () => {
    const filter = { environment: environmentId, name: applicationName };

    const update = {
      $push: {
        buildHistory: history
      }
    };

    return await ApplicationModel.findOneAndUpdate(filter, update, { new: true });
  };

  return await runQueryHelper(runQuery);
}