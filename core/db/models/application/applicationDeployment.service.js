const constants = require("../../../utils/constants");
const { runQueryHelper } = require('../helpers');
const ApplicationDeploymentModel = require('./applicationDeployment');

// declarations
exports.add = add;
exports.list = list;
exports.listByDate = listByDate;
exports.getSummary = getSummary;
exports.getApplicationLatestDeployment = getApplicationLatestDeployment;

async function add(deployment) {
  try {
    const doc = new ApplicationDeploymentModel(deployment);
    await doc.save();
    return {
      success: true,
    };
  } catch (err) {
    console.log(`error:`, err.message);
    let message = err.message;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message,
    };
  }
}

async function list(accountId, environmentName, applicationName) {
  const runQuery = async () => {
    const filter = {
      accountId,
      ...(environmentName ? { environmentName } : {}),
      ...(applicationName ? { applicationName } : {}),
    };
    return await ApplicationDeploymentModel.find(filter, { _id: 0, __v: 0 })
      .populate("job", "startTime lastUpdated status")
      .sort({ createdAt: -1 })
      .exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}

async function listByDate(accountId) {
  const runQuery = async () => {
    const query = [
      {
        $match: {
          accountId: accountId,
          createdAt: {
            $exists: true,
          },
        },
      },
      {
        $project: {
          _id: 0,
          createdAt: 1,
          environmentName: 1,
          applicationName: 1,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d"
            },
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          day: "$_id",
          value: 1,
          _id: 0,
        },
      },
    ];
    return await ApplicationDeploymentModel.aggregate(query);
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}


async function getSummary(accountId, startDate, endDate, environmentName, applicationName) {
  const runQuery = async () => {
    const query = [
      {
        $match: {
          accountId: accountId,
          environmentName: environmentName,
          applicationName: applicationName,
          createdAt: {
            $exists: true,
          },
        },
      },
      {
        $group: {
          _id: "$createdAt",
        },
      },
      {
        $project: {
          date: "$_id",
          _id: 0,
        },
      },
      {
        $match: {
          date: {
            "$gte": new Date(startDate),
            "$lte": new Date(endDate)
          }
        }
      }
    ];
    return await ApplicationDeploymentModel.aggregate(query);
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}

async function getApplicationLatestDeployment( accountId, environmentName, applicationName) {
  const runQuery = async () => {
    const filter = { accountId, environmentName, applicationName };
    return await ApplicationDeploymentModel.findOne(filter, { _id: 0, __v: 0 })
      .sort({ _id: -1 })
      .populate("job", "startTime lastUpdated status")
      .exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
