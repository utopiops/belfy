const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const { defaultLogger: logger } = require('../../../logger');
const DockerModel = require('./dockerApplication');
const UtopiopsApplicationModel = require('./utopiopsApplication');
const UtopiopsApplicationService = require('./utopiopsApplication.service');
const config = require('../../../utils/config').config;
const DomainModel = require('../domain/domain');
const dockerizedApplicationSizes = require('../../../utils/dockerizedApplicationSizes');
const HttpService = require('../../../utils/http/index');
const http = new HttpService();

exports.createDockerApplication = createDockerApplication;
exports.updateDockerApplication = updateDockerApplication;

//-----------------------------------------------------------------------
async function createDockerApplication(app, headers) {
	const runQuery = async () => {
		// Check if application already exists
		const filter = {
			name: app.name
		}

		const doc = await UtopiopsApplicationModel.findOne(filter);
		if(doc) {
			return {
				success: false,
				error: {
					message: constants.errorMessages.models.duplicate,
					statusCode: constants.statusCodes.badRequest
				}
			}
		}

		let domainDoc;
		if(app.domainName) {
			// Check if domain exists
			const domainFilter = {
				domainName: app.domainName,
				accountId: app.accountId
			}

			domainDoc = await DomainModel.findOne(domainFilter);
			if(!domainDoc) {
				return {
					success: false,
					error: {
						message: constants.errorMessages.models.notFound,
						statusCode: constants.statusCodes.notFound
					}
				};
			}
		}


		app.jobName = app.domainName ? `${app.name}.${app.domainName}` : app.name;
		if(app.domainName) {
			app.cpu = dockerizedApplicationSizes[app.size].cpu;
			app.memory = dockerizedApplicationSizes[app.size].memory;
		}


		await createPipeline(app, headers);

		if(app.domainName) {
			app.domainId = domainDoc._id;
		}
		
		if(app.domainName){
			app.domain = `https://${app.name + '.' + app.domainName}`;
		}
		else {
			app.domain = `https://${app.name + config.dockerSubdomain}.utopiops.com`;
		}
    app.size = app.size || 'free';

		const result = await DockerModel.create(app);
    if (!result || result.error) {
      return result;
    }

    await UtopiopsApplicationService.startApplicationPlan(app.accountId, app.name, app.domainName, constants.applicationKinds.docker, app.size);

    return {
      success: true,
    }
	};

	return await runQueryHelper(runQuery);
}
//-----------------------------------------------------------------------
async function createPipeline(app, headers) {
	if (process.env.IS_LOCAL) {
		// Pipeline actions is not supported in local environment
		return {
		  success: true,
		};
	}

	if(app.domainId) { // For the update case
		const filter = {
			_id: app.domainId,
			accountId: app.accountId
		}
		const domainDoc = await DomainModel.findOne(filter).exec();
		if(!domainDoc) {
			return {
				success: false,
				error: {
					message: constants.errorMessages.models.notFound,
					statusCode: constants.statusCodes.notFound
				}
			}
		}
		app.domainName = domainDoc.domainName;
	}
	
	const params = {
		name: app.name,
		domainName: app.domainName,
		port: app.port,
		environmentVariables: app.environmentVariables,
		jobName: app.jobName,
		healthCheckPath: app.healthCheckPath,
		volumePath: app.volumePath,
		storageCapacity: app.storageCapacity,
		size: app.size,
		kind: constants.applicationKinds.docker,
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
		success: true
	}
}
//-----------------------------------------------------------------------
async function updateDockerApplication(app, headers) {
	const runQuery = async () => {
		const filter = {
			name: app.name,
			accountId: app.accountId,
			kind: constants.applicationKinds.docker
		}

		let doc = await UtopiopsApplicationModel.findOne(filter).populate('domainId', 'domainName');
		if (!doc) {
			return {
				error: {
					statusCode: constants.statusCodes.badRequest,
					message: constants.errorMessages.models.elementNotFound
				}
			}
		}

		if(app.size !== doc.size) {
			app.cpu = dockerizedApplicationSizes[app.size].cpu;
			app.memory = dockerizedApplicationSizes[app.size].memory;
		}

		doc = await UtopiopsApplicationModel.findOneAndUpdate(filter, app, { new: 1 }).exec();

		if (!doc) {
			return {
				error: {
					statusCode: constants.statusCodes.badRequest,
					message: constants.errorMessages.models.elementNotFound
				}
			}
		}

		const res = await UtopiopsApplicationService.deletePipeline(doc.accountId, doc.name, headers);
		if(res.error) return res;

		return await createPipeline(doc, headers);
	  };
  
	  return await runQueryHelper(runQuery);
  }