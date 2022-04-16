const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const FunctionModel = require('./functionApplication');
const UtopiopsApplicationModel = require('./utopiopsApplication');
const UtopiopsApplicationService = require('./utopiopsApplication.service');
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const config = require('../../../utils/config').config;

exports.createFunctionApplication = createFunctionApplication;
exports.updateFunctionApplication = updateFunctionApplication;
exports.updateFunctionApplicationHistory = updateFunctionApplicationHistory;


//-----------------------------------------------------------------------
async function createFunctionApplication(app, headers) {
  const runQuery = async () => {
    // Check if application already exists
    const filter = {
      name: app.name,
      accountId: app.accountId,
    };

    const doc = await UtopiopsApplicationModel.findOne(filter);
    if (doc) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.duplicate,
          statusCode: constants.statusCodes.badRequest,
        },
      };
    }

    const appName = app.name;

    app.jobName = appName;
    app.domain = `https://${appName + config.functionSubdomain}.utopiops.com`;
    app.integrationName = app.integration_name;

    const result = await FunctionModel.create(app);
    if (!result || result.error) {
      return result;
    }

    await createPipeLine(app.accountId, app.name, headers);

    await UtopiopsApplicationService.startApplicationPlan(app.accountId, app.name, '', constants.applicationKinds.function);

    return {
      success: true,
    }
  };

  return await runQueryHelper(runQuery);
}
//-----------------------------------------------------------------------
async function updateFunctionApplication(app, headers) {
  const runQuery = async () => {
    // Check if application already exists
    const filter = {
      name: app.name,
      accountId: app.accountId,
    };

	const updatedApp = await FunctionModel.findOneAndUpdate(filter, app, { new: 1 }).exec();
	if (!updatedApp) {
		return {
			error: {
				statusCode: constants.statusCodes.badRequest,
				message: constants.errorMessages.models.elementNotFound
			}
		}
	}

	const res = await UtopiopsApplicationService.deletePipeline(updatedApp.accountId, updatedApp.name, headers)
	if (res.error) return res

	const result = await createPipeLine(updatedApp.accountId, updatedApp.name, headers);
	if (result.error) return result


    return {
		success: true
	}
  };

  return await runQueryHelper(runQuery);
}
//-----------------------------------------------------------------------
async function createPipeLine(accountId, functionName, headers){

	if (process.env.IS_LOCAL) {
		// Pipeline actions is not supported in local environment
		return {
		  success: true,
		};
	}

	const filter = {
		name: functionName,
		accountId
	}

	const app = await UtopiopsApplicationModel.findOne(filter);
	if(!app) {
		return {
			error: {
				statusCode: constants.statusCodes.badRequest,
				message: constants.errorMessages.models.elementNotFound
			}
		}
	}

	const params = {
		kind: constants.applicationKinds.function,
		integrationName: app.integrationName,
		repositoryUrl: app.repositoryUrl,
		jobName: app.jobName,
		branch: app.branch,
		accountId,
		applicationName: functionName,
		isParameterized: false,
	}

	try {
		await http.post(`${config.ciHelperUrl}/job/create`, params, {
			headers,
		});
	} catch (error) {
		logger.error(`Error in pipeline creation:: ${error}`)
		return {
			error: {
				statusCode: constants.statusCodes.ise,
				message: error.message
			}
		}
	}

	return {
		success: true,
	};
}
//-----------------------------------------------------------------------
async function updateFunctionApplicationHistory(accountId, applicationName, newCommit) {
	const runQuery = async () => {
		  const filter = {
			  name: applicationName,
			  accountId,
			  kind: constants.applicationKinds.function
		  }
  
		  const update = {
			  $push: {
				  history: newCommit
			  }
		  }
  
		  return await UtopiopsApplicationModel.findOneAndUpdate(filter, update, { new: 1 }).exec();
	  };
  
	  return await runQueryHelper(runQuery);
  }