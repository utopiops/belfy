const constants = require('../../../utils/constants');
const TerraformModuleModel = require('./terraformModule');
const EnvironmentModel = require('../environment/environment')
const { runQueryHelper } = require('../helpers');
const ObjectId = require('mongoose').Types.ObjectId;
const queueService = require('../../../queue');
const environmentService = require('../environment/environment.service');
const logger = require('../../../utils/logger');
const config = require('../../../utils/config').config;
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job')
const job = new Job()
const HttpService = require('../../../utils/http');

const appQueName = config.queueName;

module.exports = {
	getTerraformModuleDetailsVersion,
	listTfModules,
  listTfModuleVersions,
	listAccountTerraformModules,
  createTfModule,
  updateTfModule,
  getTerraformModuleSummary,
  addTfModule,
	deleteTfModule,
  activateTerraformModule,
  dryRunTerraformModule,
	deployTerraformModule,
	destroyTerraformModule,
  setState
}

//-----------------------------
async function listAccountTerraformModules(accountId) {
	const runQuery = async () => {
		return await TerraformModuleModel.aggregate([
			{
				$lookup: {
					from: 'environment_v2',
					localField: 'environment',
					foreignField: '_id',
					as: 'tf_with_env'
				}
			},
			{
				$match: {
					'tf_with_env.accountId': ObjectId(accountId)
				}
			},
			{
				$unwind: '$tf_with_env'
			},
			{
				$project: {
					id: 1,
					state: 1,
					name: 1,
					repositoryUrl: 1,
					activeVersion: 1,
					environmentName: '$tf_with_env.name'
				}
			}
		]);
	};
	const extractOutput = (result) => [
		...result.map((tfModule) => ({
			id: tfModule._id,
			state: tfModule.state,
			name: tfModule.name,
			repositoryUrl: tfModule.repositoryUrl,
			activeVersion: tfModule.activeVersion,
			environmentName: tfModule.environmentName
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function listTfModules(accountId, environmentName) {
	try {
		let result = await environmentService.listEnvironmentIdsByAccount(accountId, environmentName);
		if (!result.success) return result;
		environmentIds = result.outputs.environmentIds.map(e => e.id);
	
		const filter = { environment: { $in: environmentIds } };
		const modules = await TerraformModuleModel.find(filter, { name: 1, repositoryUrl: 1, activeVersion: 1, state: 1 })
			.populate('environment', 'name')
			.exec();
		if (modules == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let moduleList = modules.map(m => ({
			name: m.name,
			environmentName: m.environment.name,
			repositoryUrl: m.repositoryUrl,
			state: m.state,
			activeVersion: m.activeVersion,
		}));
		return {
			success: true,
			outputs: {
				modules: moduleList
			}
		}
	} catch (err) {
		console.log(`error`, err);
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate;
		}
		return {
			success: false,
			message: message
		};
	}
}
//-----------------------------
async function listTfModuleVersions(accountId, environmentName, tfModuleName) {
	try {
		let result = await environmentService.getEnvironmentIdAndProvider(accountId, environmentName);
		if (!result.success) return result;
		environmentId = result.outputs.id;
		
		const filter = { environment: environmentId, name: tfModuleName };
		const tfModule = await TerraformModuleModel.findOne(filter).exec();
		if (tfModule == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let versions = tfModule.versions.map(m => ({
			...m._doc,
			_id: undefined,
			createdBy: undefined,
		}));
		return {
			success: true,
			outputs: {
				versions
			}
		}
	} catch (err) {
		console.error(`error: `, err);
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate;
		}
		return {
			success: false,
			message: message
		};
	}
}
//-------------------------------------------------------------
async function getTerraformModuleDetailsVersion(environmentId, tfModuleName, version) {
	const runQuery = async () => {
		const filter = { environment: new ObjectId(environmentId), name: tfModuleName };
		return await TerraformModuleModel.findOne(filter, { _id: 0, __v: 0, 'versions._id': 0, 'versions.createdBy': 0 }).populate('environment', 'name').exec();
	};
	const extractOutput = (result) => {
		const terraformModuleVersion = result.versions[version - 1];
		const resultObject = result.toObject();
		delete resultObject.versions;
		const environmentName = resultObject.environment.name;
		delete resultObject.environment;
		return {
			terraformModule: {
				environmentName,
				...resultObject
			},
			terraformModuleVersion
		};
	};
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function createTfModule(data) {
	const runQuery = async () => {
		// Check if module already exists
		const filter = { environment: new ObjectId(data.environment), name: data.name };
		const doc = await TerraformModuleModel.findOne(filter).exec();
		if (doc) {
			return {
				success: false,
				error: {
					message: constants.errorMessages.models.duplicate,
					statusCode: constants.statusCodes.badRequest
				}
			};
		}

		const {
			name,
			userId,
      environment,
		} = data;

		const tfModule = {
      name,
      environment: ObjectId(environment),
      createdBy: userId,
			gitService: data.gitService,
      repositoryUrl: data.repositoryUrl,
			versions: [
				{
					...data,
					createdBy: userId
				}
			],
			values: data.values,
			secrets: data.secrets,
			secretName: data.secretName
		};
		return await TerraformModuleModel.create(tfModule);
	};

  const extractOutput = (outputs) => {
    return {
      version: 1
    }
  }

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function updateTfModule(environmentId, tfModuleName, version, data) {
	const runQuery = async () => {
		const filter = {
			name: tfModuleName,
			environment: ObjectId(environmentId),
			versions: {
				$elemMatch: {
					version: version,
					isActivated: false,
				}
			}
		};
		const update = {
			$set: {
				'versions.$[i]': data
			}
		};
		const extras = {new: true, arrayFilters: [{'i.version': version}]}
		return  await TerraformModuleModel.findOneAndUpdate(filter, update, extras);
	};

  const extractOutput = (outputs) => {
    return {
      version
    }
  }

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function getTerraformModuleSummary(environmentId, tfModuleName) {
	const runQuery = async () => {
		const filter = {
			name: tfModuleName,
			environment: ObjectId(environmentId),
		};
		return await TerraformModuleModel.findOne(filter, { _id: 0, values: 1, secrets: 1 });

	};
	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function addTfModule(environmentId, tfModuleName, version, data) {
  const runQuery = async () => {
		// Check if the terraform module exists and it has the version sent by the user
		// and send the maximum version
		const filter = {
			environment: ObjectId(environmentId),
			name: tfModuleName, 
			versions: {
				$elemMatch: {
					version: Number(version)
				}
			}
		}
		const maxVersion = await TerraformModuleModel.aggregate([
			{
				$match: filter
			},
			{
				$project: {
					count: {$size: '$versions'}
				}
			}
		])
    if(!maxVersion.length) {
      return;
    }
		data.version = maxVersion[0].count + 1;
		const update = {
			$push: {
				versions: data
			}
		}
		return await TerraformModuleModel.findOneAndUpdate(filter, update, {new : 1})
	};

  const extractOutput = (outputs) => {
    return {
      version: outputs.versions.length
    }
  }

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function addTfModule(environmentId, tfModuleName, version, data) {
  const runQuery = async () => {
		// Check if the terraform module exists and it has the version sent by the user
		// and send the maximum version
		const filter = {
			environment: ObjectId(environmentId),
			name: tfModuleName, 
			versions: {
				$elemMatch: {
					version: Number(version)
				}
			}
		}
		const maxVersion = await TerraformModuleModel.aggregate([
			{
				$match: filter
			},
			{
				$project: {
					count: {$size: '$versions'}
				}
			}
		])
    if(!maxVersion.length) {
      return;
    }
		data.version = maxVersion[0].count + 1;
		const update = {
			$push: {
				versions: data
			}
		}
		return await TerraformModuleModel.findOneAndUpdate(filter, update, {new : 1})
	};
	return await runQueryHelper(runQuery);
}
//-----------------------------
async function deleteTfModule(environmentId, tfModuleName) {
	const runQuery = async () => {
		// Check if such terraform module exists
		const filter = { environment: new ObjectId(environmentId), name: tfModuleName };
		const doc = await TerraformModuleModel.findOne(filter, { state: 1, activeVersion: 1 }).exec();

		if (doc == null) {
			throw new Error(constants.errorMessages.models.elementNotFound);
		}
		// TODO: This is just the basic condition for now, has to be refined later as we use the database and figure out the common usage patterns
		let canDelete = false;
		if (doc.state.code === 'destroyed' || doc.state.code === 'created' || doc.state.code === 'destroy_failed' || !doc.activeVersion) {
			canDelete = true;
		}
		if (!canDelete) {
			return {
				success: false,
				error: {
					statusCode: constants.statusCodes.badRequest,
					message: 'Cannot delete the terraform module, it needs to be destroyed first'
				}
			}
		}
		await TerraformModuleModel.findByIdAndDelete(doc._id).exec();
		return {
			success: true
		};
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function activateTerraformModule(environmentId, tfModuleName, version) {
	const filter = {
    environment: new ObjectId(environmentId),
		name: tfModuleName,
		activeVersion: { $ne: version },
		'versions.version': version
	};
	try {
		// First we check the activated version is not this version and this version exists
		const doc = await TerraformModuleModel.findOne(filter).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const update = {
			activeVersion: Number(version),
			'versions.$[i].isActivated': true
		};
		const arrayFilters = [ { 'i.version': version } ];
		// Then we update activatedVersion field and isActivated field of old and new version
		const updated = TerraformModuleModel.findOneAndUpdate(filter, update, { new: true, arrayFilters }).exec();
		if (updated == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------
async function setState(environmentId, tfModuleName, state) {
    try {
      const stateCode = state.code;
      let validCurrentState = [];
      switch (stateCode) {
          case 'destroyed':
          case 'destroy_failed':
              validCurrentState = ['destroying']
              break;
          case 'deployed':
          case 'deploy_failed':
              validCurrentState = ['deploying']
              break;
          case 'destroying':
              validCurrentState = [null, 'deployed', 'destroy_failed', 'deploy_failed']
              break;
          case 'deploying':
              validCurrentState = [null, 'created', 'deployed', 'destroyed', 'destroy_failed', 'deploy_failed']
              break;
      }

      const filter = {
          environment: environmentId,
          name: tfModuleName,
          'state.code': { $in: validCurrentState }
      };
      const module = await TerraformModuleModel.findOneAndUpdate(filter, { $set: { state } }, { new: true }).exec();
      if (module == null) {
          return {
              success: false,
              message: constants.errorMessages.models.elementNotFound
          };
      }
      return {
          success: true
      };

  } catch (err) {
      console.error(`error: `, err.message);
      let message = err.message;
      return {
          success: false,
          message: message
      };
  }
}
//--------------------------------------
async function setJobId(environmentId, tfModuleName, jobId) {
  const filter = { 
    environment: environmentId,
    name: tfModuleName,
  };
  const update = {
    $set: {"state.job": jobId }
  }
  return await TerraformModuleModel.findOneAndUpdate(filter, update, { new: true }).exec();
}
//--------------------------------------
async function listTfModules(accountId, environmentName) {
	try {
		let result = await environmentService.listEnvironmentIdsByAccount(accountId, environmentName);
		if (!result.success) return result;
		environmentIds = result.outputs.environmentIds.map(e => e.id);
	
		const filter = { environment: { $in: environmentIds } };
		const modules = await TerraformModuleModel.find(filter, { name: 1, repositoryUrl: 1, activeVersion: 1, state: 1 })
			.populate('environment', 'name')
			.exec();
		if (modules == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let moduleList = modules.map(m => ({
			name: m.name,
			environmentName: m.environment.name,
			repositoryUrl: m.repositoryUrl,
			state: m.state,
			activeVersion: m.activeVersion,
		}));
		return {
			success: true,
			outputs: {
				modules: moduleList
			}
		}
	} catch (err) {
		console.log(`error`, err);
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate;
		}
		return {
			success: false,
			message: message
		};
	}
  }
//---------------------------------------
async function listTfModuleVersions(accountId, environmentName, tfModuleName) {
	try {
		let result = await environmentService.getEnvironmentIdAndProvider(accountId, environmentName);
		if (!result.success) return result;
		environmentId = result.outputs.id;
		
		const filter = { environment: environmentId, name: tfModuleName };
		const tfModule = await TerraformModuleModel.findOne(filter).exec();
		if (tfModule == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let versions = tfModule.versions.map(m => ({
			...m._doc,
			_id: undefined,
			createdBy: undefined,
		}));
		return {
			success: true,
			outputs: {
				versions
			}
		}
	} catch (err) {
		console.error(`error: `, err);
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate;
		}
		return {
			success: false,
			message: message
		};
	}
}
//---------------------------------------
async function dryRunTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, version, provider, credentials, headers, values = [], secrets= []) {
  const filter = {
    environment: ObjectId(environmentId),
    name: tfModuleName
  };
  const terraformModule = await TerraformModuleModel.findOne(filter).exec();
  version = version || terraformModule.activeVersion
  const terraformModuleVersion = terraformModule.versions[version - 1];

	// Fetch secrets
	const http = new HttpService();
	const url = `${config.secretManagerUrl}/simple/array/value`;
	const names = terraformModule.secretName ? [terraformModule.secretName] : [];
	secrets.forEach(s => {
		names.push(s.value);
	})
	const body = { names };
	const reqConfig = { headers };
	let response;
	let token;
	if(terraformModule.secretName || secrets.length > 0) {
		response = await http.post(url, body, reqConfig);
		token = terraformModule.secretName ? response.data[terraformModule.secretName] : undefined;
		secrets.forEach(s => {
			if(response.data[s.value]) {
				s.value = response.data[s.value];
			}
		});
	}
	

	let jobPath;
	switch (provider.backend.name) {
		case 'aws':
			jobPath = constants.jobPaths.dryRunTerraformModule;
			break;
		default:
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
	}

	const message = {
		jobPath,
		jobDetails: {
			userId,
			accountId,
			details: {
				environmentName,
        providerDetails: provider.backend,
				version,
        credentials,
        tfModuleName: terraformModule.name,
				gitService: terraformModule.gitService,
        repositoryUrl: terraformModule.repositoryUrl,
				token,
				tfVars: [
					...values,
					...secrets
				],
        code: terraformModuleVersion.code,
        tfVersion: terraformModuleVersion.tfVersion,
        release: terraformModuleVersion.release
			}
		}
	};
	logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
	const options = {
		userId: message.jobDetails.userId,
		accountId: message.jobDetails.accountId,
		path: message.jobPath,
		jobDataBag: {
			environmentName
		}
	};
	try {
		const jobId = await queueService.sendMessage(appQueName, message, options);

		const jobNotification = {
			accountId: message.jobDetails.accountId,
			category: "infw",
			dataBag: {
				jobPath: message.jobPath,
				environmentName,
				tfModuleName,
				status: 'created',
				jobId
			}
		}

   		const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config);

		return {
			success: true,
			outputs: {
				jobId
			}
		};
	} catch (error) {
		console.log(`error: ${error.message}`);
		return {
			success: false,
			message: 'Failed to schedule the job!'
		};
	}
}
//---------------------------------------
async function deployTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, provider, credentials, headers, values = [], secrets = []) {
	try {
    const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
    if(!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notAllowed,
          message: 'The intended environment must be deployed to be able to deploy the application'
        }
      }
    }

		// Clone secrets to a new array
		const secretsCopy = secrets.map(s => ({
			...s
		}));

		// Checking that the environment has an activated version
		const filter = {
			environment: ObjectId(environmentId),
			name: tfModuleName
		};
		const terraformModule = await TerraformModuleModel.findOne(filter).exec();

		if (!terraformModule.activeVersion) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}

		// Fetch secrets from secret manager
		const http = new HttpService();
		const url = `${config.secretManagerUrl}/simple/array/value`;
		const names = terraformModule.secretName ? [terraformModule.secretName] : [];
		secrets.forEach(s => {
			names.push(s.value);
		})
		const body = { names };
		const reqConfig = { headers };
		let response;
		let token;
		if(terraformModule.secretName || secrets.length > 0) {
			response = await http.post(url, body, reqConfig);
			token = terraformModule.secretName ? response.data[terraformModule.secretName] : undefined;
			secrets.forEach(s => {
				if(response.data[s.value]) {
					s.value = response.data[s.value];
				}
			});
		}

    const terraformModuleVersion = terraformModule.versions[terraformModule.activeVersion - 1];

    const state = { code: 'deploying' }
    const result = await setState(environmentId, tfModuleName, state)
    if (!result.success) {
      return result
    }

		let jobPath;
		switch (provider.backend.name) {
			case 'aws':
				jobPath = constants.jobPaths.deployTerraformModule;
				break;
			default:
				return {
					success: false,
					message: constants.errorMessages.models.elementNotFound
				};
		}

		// TODO: check the environment lock and also update the environment state

		const message = {
			jobPath,
			jobDetails: {
				userId,
				accountId,
				details: {
					environmentName,
					providerDetails: provider.backend,
					credentials,
					tfModuleName: terraformModule.name,
					repositoryUrl: terraformModule.repositoryUrl,
					gitService: terraformModule.gitService,
					token,
					tfVars: [
						...values,
						...secrets
					],
					code: terraformModuleVersion.code,
					tfVersion: terraformModuleVersion.tfVersion,
					release: terraformModuleVersion.release
				}
			}
		};
		logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
		const options = {
			userId: message.jobDetails.userId,
			accountId: message.jobDetails.accountId,
			path: message.jobPath,
			jobDataBag: {
				environmentName
			}
		};
		const jobId = await queueService.sendMessage(appQueName, message, options);
  
		const jobNotification = {
			accountId: message.jobDetails.accountId,
			category: "infw",
			dataBag: {
				jobPath: message.jobPath,
				environmentName,
				tfModuleName,
				status: 'created',
				jobId
			}
		};

   		const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config);

		await setJobId(environmentId, tfModuleName, jobId); // TODO: fix it
		await TerraformModuleModel.findOneAndUpdate(filter, { deployedVersion: terraformModule.activeVersion, values, secrets: secretsCopy }).exec();
		return {
			success: true,
			outputs: {
				jobId
			}
		};
	} catch (error) {
		console.log(`error: ${error.message}`);
		return {
			success: false,
			message: 'Failed to schedule the job!'
		};
	}
}
//---------------------------------------
async function destroyTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, provider, credentials, headers) {
	try {
		const filter = {
			environment: ObjectId(environmentId),
			name: tfModuleName
		};
		const terraformModule = await TerraformModuleModel.findOne(filter).exec();

    const terraformModuleVersion = terraformModule.versions[terraformModule.deployedVersion - 1]; // I don't know what is deployed version??

		// Fetch secrets
		const http = new HttpService();
		const url = `${config.secretManagerUrl}/simple/array/value`;
		const names = terraformModule.secretName ? [terraformModule.secretName] : [];
		const body = { names };
		const reqConfig = { headers };
		let response;
		let token;
		if(terraformModule.secretName) {
			response = await http.post(url, body, reqConfig);
			token = terraformModule.secretName ? response.data[terraformModule.secretName] : undefined;
		}

    const state = { code: 'destroying' }
    const result = await setState(environmentId, tfModuleName, state);
    if (!result.success) {
      return result
    }

		let jobPath;
		switch (provider.backend.name) {
			case 'aws':
				jobPath = constants.jobPaths.destroyTerraformModule;
				break;
			default:
				return {
					success: false,
					message: constants.errorMessages.models.elementNotFound
				};
		}

		const message = {
			jobPath,
			jobDetails: {
				userId,
				accountId,
				details: {
					environmentName,
					providerDetails: provider.backend,
					credentials,
					token,
					tfVars: [
						...terraformModule.values,
						...terraformModule.secrets
					],
					tfModuleName: terraformModule.name,
					gitService: terraformModule.gitService,
					repositoryUrl: terraformModule.repositoryUrl,
					code: terraformModuleVersion.code,
					tfVersion: terraformModuleVersion.tfVersion,
					release: terraformModuleVersion.release
				}
			}
		};
		logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
		const options = {
			userId: message.jobDetails.userId,
			accountId: message.jobDetails.accountId,
			path: message.jobPath,
			jobDataBag: {
				environmentName
			}
		};
		const jobId = await queueService.sendMessage(appQueName, message, options);

		const jobNotification = {
			accountId: message.jobDetails.accountId,
			category: "infw",
			dataBag: {
				jobPath: message.jobPath,
				environmentName,
				tfModuleName,
				status: "created",
				jobId
			}
		};
		
       	const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config);

		await setJobId(environmentId, tfModuleName, jobId);
		return {
			success: true,
			outputs: {
				jobId
			}
		};
	} catch (error) {
		console.log(`error: ${error.message}`);
		return {
			success: false,
			message: 'Failed to schedule the job!'
		};
	}
}
