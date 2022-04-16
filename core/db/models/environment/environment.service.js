const constants = require('../../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const dnsPromises = require('dns').promises;
const AwsEnvironmentV2Model = require('./awsEnvironment');
const AwsEnvironmentService = require('./awsEnvironment.service');
const EnvironmentV2Model = require('./environment');
const ApplicationModel = require('../application/application');
const ElasticacheRedisModel = require('../elasticache_redis/elasticacheRedis');
const TerraformModuleModel = require('../terraform_module/terraformModule');
const KubernetesClusterModel = require('../kubernetes/kubernetesCluster');
const ApplicationVersionModel = require('../application/applicationVersion');
const EnvironmentDeploymentService = require('./environmentDeployment.service');
const EnvironmentDeploymentModel = require('./environmentDeployment');
const CertificateModel = require('../ssl_tls_certificate_v2/ssl_tls_certificate');
const DatabaseModel = require('../database/databaseServer');
const MetricModel = require('../environment_metric/environmentMetricProvider');
const config = require('../../../utils/config').config;
const queueService = require('../../../queue');
const logger = require('../../../utils/logger');
const { runQueryHelper } = require('../helpers');
const { decrypt } = require('../../../utils/encryption');
const { alarmEffects } = require('../environment_alarm/alarmEffects');
const { alarmStatusValues } = require('../environment_alarm/alarmStatusValues');
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job')
const job = new Job()

const appQueName = config.queueName;

module.exports = {
	addAwsEnvironment,
	addAzureEnvironment,
	addGcpEnvironment,
	getAll,
	getEnvironmentsWithStatus, // This might have deprecated getAll, TODO: remove getAll if not used anymore
	listEnvironmentIdsByAccount,
	getEnvironmentProvider,
	getEnvironmentProviderName,
	getEnvironmentDetails,
	getEnvironmentDetailsVersion,
  setEnvironmentState,
	getEnvironmentIdAndProvider,
	getEnvironmentRegionAndProviderName,
	deleteEnvironment,
	destroyEnvironment,
	dryRunEnvironment,
	deployEnvironment,
	activateEnvironment,
  verifyNsRecords,
	clone
};

async function addAwsEnvironment(data) {
	const runQuery = async () => {
		const {
			name,
			region,
			description,
			accountId,
			tfCodePath,
			providerId,
			providerName,
			userId,
			domain
		} = data;

		const env = {
			accountId,
			name,
			region,
			description,
			tfCodePath,
			provider: ObjectId(providerId),
			providerName,
			kind: constants.cloudProviders.aws,
			domain,
			isNsVerified: !domain.create,
			versions: [
				{
					providerName: constants.cloudProviders.aws,
					createdBy: data.userId
				}
			]
		};
		const newEnv = await EnvironmentV2Model.create(env);
		const environmentId = newEnv._id;
		// todo: handle if this fails (maybe rollback ?!)
		await MetricModel.addProviderCloudWatch(environmentId, userId);
		return true;
	};
	return await runQueryHelper(runQuery);
}
//-------------------------------------------------------------
async function addAzureEnvironment(data) {
  const runQuery = async () => {
		const {
			name,
			location,
			description,
			accountId,
			providerId,
      providerName,
			domain,
			enableVnetDdosProtection,
			userId
		} = data;

		const env = {
			accountId,
			name,
			location,
      domain,
			description,
			provider: ObjectId(providerId),
      providerName,
      kind: constants.cloudProviders.azure,
			versions: [
				{
					providerName: constants.cloudProviders.azure,
          enableVnetDdosProtection,
					createdBy: userId,
				}
			]
		};
		const newEnv = await EnvironmentV2Model.create(env);
		const environmentId = newEnv._id;
		// todo: handle if this fails (maybe rollback ?!)
		// await MetricModel.addProviderCloudWatch(environmentId, userId); todo: add azure log
		return true;
	};
	return await runQueryHelper(runQuery);
}
//-------------------------------------------------------------
async function addGcpEnvironment(data) {
  const runQuery = async () => {
		const {
			name,
			region,
			description,
			accountId,
			providerId,
      providerName,
			dns,
			userId
		} = data;

		const env = {
			accountId,
			name,
			region,
      dns,
			description,
			provider: ObjectId(providerId),
      providerName,
      kind: constants.cloudProviders.gcp,
			versions: [
				{
					providerName: constants.cloudProviders.gcp,
					createdBy: userId,
				}
			]
		};
		const newEnv = await EnvironmentV2Model.create(env);
		const environmentId = newEnv._id;
		// todo: handle if this fails (maybe rollback ?!)
		// await MetricModel.addProviderCloudWatch(environmentId, userId); todo: add gcp log
		return true;
	};
	return await runQueryHelper(runQuery);
}
//-------------------------------------------------------------
async function getAll(accountId) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId) };
		return await EnvironmentV2Model.find(filter, { name: 1, 'status.code': 1, provider: 1 })
			.populate('provider')
			.exec();
	};
	const extractOutput = (result) => ({
		environments: result.map((d) => ({
			name: d.name,
			statusCode: d.status.code,
			...(d.provider && {
				providerName: d.provider.backend.name,
				providerDisplayName: d.provider.displayName
			})
		}))
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentsWithStatus(accountId) {
	const runQuery = async () => {
	  return await EnvironmentV2Model.aggregate([
		{
		  $match: {
			accountId: new ObjectId(accountId),
		  },
		},
		{
		  $lookup: {
			from: 'alarms',
			localField: '_id',
			foreignField: 'environment',
			as: 'alarms',
		  },
		},
		{
		  $lookup: {
			from: 'providers',
			localField: 'provider',
			foreignField: '_id',
			as: 'provider',
		  },
		},
		{
		  $unwind: '$provider',
		},
		{
		  $project: {
			providerDisplayName: '$provider.displayName',
			providerName: '$provider.backend.name',
			name: 1,
      isNsVerified: 1,
			activeVersion: 1,
			deployedVersion: 1,
			'alarms.status': 1,
			'alarms.severity': 1,
			'state.code': 1,
			'state.job': 1,
			_id: 0,
		  },
		},
	  ]);
	};
  
	const extractOutput = (environmentsWithAlarms) => {
	  environmentsWithAlarms.forEach(function (value, index) {
		let status = 'no_alarm';
		const alarms = value.alarms;
		if (alarms.length) {
		  status = '';
		  // Set the status based on the alarms and their severity
		  for (let i = 0; i < alarms.length; i++) {
			if (alarms[i].status === alarmStatusValues.alarm) {
			  if (alarms[i].severity >= 5) {
				// As soon as we see a critical alarm we set the status and exit the loop
				status = 'critical';
				break;
			  } else {
				// If the we see a warning alarm we set the status to warning but still continue, we might see a critical alarm
				status = 'warning';
			  }
			} else if (alarms[i].status === alarmStatusValues.ok) {
			  status = 'healthy';
			} else if (alarms[i].status === alarmStatusValues.insufficientData) {
			  status = 'insufficient_data';
			}
		  }
		}
		this[index].status = status;
	  }, environmentsWithAlarms);
  
	  return environmentsWithAlarms;
	};
  
	return await runQueryHelper(runQuery, extractOutput);
  }
//-------------------------------------------------------------
// This function returns all the fields of provider
async function getEnvironmentProvider(accountId, environmentName) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { _id: 1, domain: 1, hostedZone: 1 }).populate('provider').exec();
	};
	const extractOutput = (result) => {
		console.log(result);
		return {
			environmentId: result._id,
			provider: result.provider,
      domain: result.domain,
			hostedZone: result.hostedZone
		};
	};
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentProviderName(accountId, environmentName) {
	const runQuery = async function() {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { _id: 1 }).populate('provider').exec();
	};
	const extractOutput = (result) => ({
		providerName: result.provider.backend.name
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentDetails(accountId, environmentName) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { _id: 0 }).populate('provider', 'displayName').exec();
	};
	const extractOutput = (result) => ({
		environment: result
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentDetailsVersion(accountId, environmentName, action, version) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { _id: 0 }).populate('provider', 'displayName').exec();
	};
	const extractOutput = (result) => {
		if (action) {
			if (action == 'apply') {
				version = result.activeVersion;
			} else if (action == 'destroy') {
				version = result.deployedVersion;
			}
		}

		const environmentVersion = result.versions[version - 1];

		const resultObject = result.toObject();
		delete resultObject.versions;
		return {
			environment: resultObject,
			environmentVersion
		};
	};
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentIdAndProvider(accountId, environmentName) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { _id: 1, provider: 1 }).populate('provider').exec();
	};
	const extractOutput = (result) => ({
		id: result._id,
		providerName: result.provider.backend.name,
		providerDisplayName: result.provider.displayName
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function listEnvironmentIdsByAccount(accountId, environmentName = null) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), ...(environmentName ? { name: environmentName } : {}) };
		return await EnvironmentV2Model.find(filter, { _id: 1 }).exec();
	};
	const extractOutput = (result) => ({
		environmentIds: result.map((d) => ({
			id: d._id
		}))
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------------------------------
async function getEnvironmentRegionAndProviderName(accountId, environmentName) {
	const runQuery = async () => {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		return await EnvironmentV2Model.findOne(filter, { region: 1, provider: 1 }).populate('provider').exec();
	};
	const extractOutput = (result) => ({
		region: result.region,
		providerName: result.provider.displayName
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function deleteEnvironment(accountId, userId, environmentId) {
	try {
		const filter = { _id: new ObjectId(environmentId) };
		const doc = await EnvironmentV2Model.findOne(filter).exec();

    if (!doc) {
      return {
				success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
			};
    }

		let canDelete = false;
		if (!doc.deployedVersion || doc.state.code === 'destroyed') {
			// the environment is not destroyed but has never been deployed or has been destroyed
			// Check if there are any dependencies for this environment
			const depFilter = { environment: environmentId };
			const deps = await Promise.all([
				ApplicationModel.findOne(depFilter, { _id: 1 }).exec(),
				DatabaseModel.findOne(depFilter, { _id: 1 }).exec(),
				CertificateModel.findOne(depFilter, { _id: 1 }).exec(),
				ElasticacheRedisModel.findOne(depFilter, { _id: 1 }).exec(),
				KubernetesClusterModel.findOne(depFilter, { _id: 1 }).exec(),
				TerraformModuleModel.findOne(depFilter, { _id: 1 }).exec()
			]);
			if (deps.every((d) => d == null)) {
				canDelete = true;
			}
		}
		if (!canDelete) {
			return {
				success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: 'Cannot delete the environment'
        }
			};
		}
		await EnvironmentV2Model.findByIdAndDelete(environmentId).exec();
		await MetricModel.deleteMetricProviders(environmentId);
    await EnvironmentDeploymentModel.updateMany({ accountId, environmentName: doc.name }, { isDeleted: true }).exec();
		return {
			success: true
		};
	} catch (err) {
    return {
      success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message: err.message
      }
    };
	}
}
//---------------------------------------
async function destroyEnvironment(accountId, userId, environmentName, provider, credentials, headers, username) {
	try {
		const filter = {
			accountId: ObjectId(accountId),
			name: environmentName
		};
		const environment = await EnvironmentV2Model.findOne(filter).exec();
		let canDestroy = false;
		if (environment.deployedVersion) {
			// Check if there are any dependencies for this environment
			const depFilter = { 
        environment: environment._id, 
        $or: [{ 'state.code': 'deployed' }, { 'state.code': 'destroy failed' }, { 'state.code': 'deploy failed' }] 
      };
			const deps = await Promise.all([
				ApplicationModel.findOne(depFilter, { _id: 1 }).exec(),
				DatabaseModel.findOne(depFilter, { _id: 1 }).exec(),
				CertificateModel.findOne(depFilter, { _id: 1 }).exec(),
				ElasticacheRedisModel.findOne(depFilter, { _id: 1 }).exec(),
				KubernetesClusterModel.findOne(depFilter, { _id: 1 }).exec(),
				TerraformModuleModel.findOne(depFilter, { _id: 1 }).exec()
			]);
			if (deps.every((d) => d == null)) {
				canDestroy = true;
			}
		}
		if (!canDestroy) {
			return {
				success: false,
				error: {
			    	message: 'Cannot destroy the environment because there are dependant applications or databases or certificates. please delete them first.',  
					statusCode: constants.statusCodes.badRequest
				}
			};
		}

    const environmentVersion = environment.versions[environment.deployedVersion - 1];

    if (provider.backend.name == 'aws'){
      environmentVersion.ecsClusterList = environmentVersion.ecsClusterList.map((cluster) => { // todo: remove this when terraform fixes the bug of capacity
        const instanceGroups = cluster.instanceGroups.map((i) => {
          return {
            ...i.toObject(),
            count: 0,
            minSize: 0,
            maxSize: 0
          }
        })
        return {
          ...cluster.toObject(),
          instanceGroups
        }
      })
    }

    const result = await setEnvironmentState(accountId, environmentName, 'destroying')
    if (!result.success) {
      return result
    }

		let jobPath;
		switch (provider.backend.name) {
			case 'aws':
				jobPath = constants.jobPaths.destroyAwsEnvironmentV4;
				break;
      case 'azure':
        jobPath = constants.jobPaths.destroyAzureEnvironment;
        break;
      case 'gcp':
        jobPath = constants.jobPaths.destroyGcpEnvironment;
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
          region: environment.region, // for aws and gcp environmnet
          location: environment.location, // for azure environmnet
          hostedZone: environment.hostedZone, // for aws environmnet
          domain: environment.domain, // for aws environmnet
          dns: environment.dns, // for azure and gcp environmnet
          ...environmentVersion.toObject()
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

    await EnvironmentDeploymentService.add({
      deployer: username ,
      environmentName ,
      jobId ,
      accountId ,
      action: 'destroy',
      state: 'destroying',
      version: environment.deployedVersion
    })

		const jobNotification = {
		accountId: message.jobDetails.accountId,
		category: "infw",
		dataBag: {
			jobPath: message.jobPath,
			environmentName,
			status: 'created',
			jobId
		}
		}

		const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config)

		await setJobId(accountId, environmentName, jobId);
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
async function dryRunEnvironment(accountId, userId, environmentName, version, provider, credentials, headers) {

  const filter = {
    accountId: ObjectId(accountId),
    name: environmentName
  };
  const environment = await EnvironmentV2Model.findOne(filter).exec();
  const environmentVersion = environment.versions[version - 1];

	let jobPath;
	switch (provider.backend.name) {
		case 'aws':
			jobPath = constants.jobPaths.dryRunAwsEnvironmentV4;
			break;
    case 'azure':
			jobPath = constants.jobPaths.dryRunAzureEnvironment;
			break;
    case 'gcp':
			jobPath = constants.jobPaths.dryRunGcpEnvironment;
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
        region: environment.region, // for aws and gcp environmnet
        location: environment.location, // for azure environmnet
        hostedZone: environment.hostedZone, // for aws environmnet
        domain: environment.domain, // for aws environmnet
        dns: environment.dns, // for azure and gcp environmnet
        ...environmentVersion.toObject()
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
async function deployEnvironment(accountId, userId, environmentName, provider, credentials, headers, username) {
	try {
		// Checking that the environment has an activated version
		const filter = {
			accountId: ObjectId(accountId),
			name: environmentName
		};
		const environment = await EnvironmentV2Model.findOne(filter).exec();
		if (!environment.activeVersion) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
  
    const environmentVersion = environment.versions[environment.activeVersion - 1];

    const result = await setEnvironmentState(accountId, environmentName, 'deploying')
    if (!result.success) {
      return result
    }

		let jobPath;
		switch (provider.backend.name) {
			case 'aws':
				jobPath = constants.jobPaths.deployAwsEnvironmentV4;
				break;
      case 'azure':
				jobPath = constants.jobPaths.deployAzureEnvironment;
				break;
      case 'gcp':
				jobPath = constants.jobPaths.deployGcpEnvironment;
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
          region: environment.region, // for aws and gcp environmnet
          location: environment.location, // for azure environmnet
          hostedZone: environment.hostedZone, // for aws environmnet
		  domain: environment.domain, // for aws environmnet
          dns: environment.dns, // for azure and gcp environmnet
          ...environmentVersion.toObject()
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

    await EnvironmentDeploymentService.add({
      deployer: username ,
      environmentName ,
      jobId ,
      accountId ,
      action: 'deploy',
      state: 'deploying',
      version: environment.activeVersion
    })

		const jobNotification = {
      accountId: message.jobDetails.accountId,
      category: "infw",
      dataBag: {
        jobPath: message.jobPath,
        environmentName,
        status: 'created',
        jobId
      }
		}

		const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config)

		await setJobId(accountId, environmentName, jobId);
		await EnvironmentV2Model.findOneAndUpdate(filter, { deployedVersion: environment.activeVersion }).exec();
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

async function activateEnvironment(accountId, environmentName, environmentId, version) {
	const filter = {
		accountId: ObjectId(accountId),
		name: environmentName,
		activeVersion: { $ne: Number(version) },
		'versions.version': Number(version)
	};
	try {
		// First we check the activated version is not this version and this version exists
		const environment = await EnvironmentV2Model.findOne(filter).exec();
		if (environment == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
    // Initial check to see if the environment version is not corrupted
    if(environment.versions[version-1].isCorrupted) {
      return {
        error: {
          message: 'This environment version is corrupted and cannot be activated',
          statusCode: constants.statusCodes.notAllowed
        }
      }
    }
    // Then check to see if the environment version can be activated
    // if the new version doesn't meet the requirements we need e.g An alb which is used by apps is not available we don't go any further
    if(environment.kind == 'aws') {
      let isValid = true;
      let message;
      const applications = await ApplicationModel.find({
        environment: ObjectId(environmentId), 
        kind: 'ecs'
      }).exec();
      if(applications.length) {
        let deployedAppVersions = []
        for(let app of applications) {
          const versionId = app.versions[app.deployedVersion ? app.deployedVersion-1 : 0];
          const appVersion = await ApplicationVersionModel.findOne({ _id: versionId })
          .populate('environmentApplication' , 'name')
          .exec();
          deployedAppVersions.push(appVersion)
        }

        const { activeVersion: activeIndex } = environment;
        const activeVersion = environment.versions.filter(v => v.version == activeIndex)[0];
        const newVersion = environment.versions.filter(v => v.version == version)[0];
        for(let v of deployedAppVersions) {
          for(let ep of v.exposed_ports) {
            // checking alb
            let match = newVersion.albList.find(item => {
              return item.displayName == ep.alb_name;
            })
            let matchesWithActive
            if(match) {
              matchesWithActive = activeVersion.albList.find(item => {
                return item.displayName == match.displayName;
              })
              if(!matchesWithActive || matchesWithActive.name !== match.name) {
                isValid = false;
                message = `Activation failed: One or more of the albs being used by ${v.environmentApplication.name} app are modified or deleted in the new version'`
                break;
              }

              match = match.listenerRules.find(item => {
                return item.port == ep.alb_listener_port
              })
              if(!match) {
                isValid = false;
                message = `Activation failed: One or more of the albs being used by ${v.environmentApplication.name} app are modified or deleted in the new version'`
                break;
              }
            } else {
              isValid = false;
              message = `Activation failed: One or more of the albs being used by ${v.environmentApplication.name} app are modified or deleted in the new version'`
              break;
            }

            // checking ecsCluster
            console.log('list ', JSON.stringify(newVersion.ecsClusterList))
            console.log(ep.ecs_cluster_name)
            match = newVersion.ecsClusterList.find(item => {
              return item.displayName == v.ecs_cluster_name;
            })
            if(match) {
              matchesWithActive = activeVersion.ecsClusterList.find(item => {
                return item.displayName == match.displayName;
              })
              if(!matchesWithActive || matchesWithActive.name !== match.name) {
                console.log('here')
                isValid = false;
                message = `Activation failed: One or more of the ecs clusters being used ${v.environmentApplication.name} app are modified or deleted in the new version`
                break;
              }
            } else {
              console.log('there')
              isValid = false;
              message = `Activation failed: One or more of the ecs clusters being used ${v.environmentApplication.name} app are modified or deleted in the new version`
              break;
            }
          }
          if(!isValid) {
            break;
          }
        }
      }
      if(!isValid) {
        return {
          error: {
            statusCode: constants.statusCodes.notAllowed,
            message
          }          
        }
      }
    }

		const update = {
			activeVersion: Number(version),
			'versions.$[i].isActivated': true
		};
		const arrayFilters = [ { 'i.version': version } ];
		// Then we update activatedVersion field and isActivated field of old and new version
		const updated = EnvironmentV2Model.findOneAndUpdate(filter, update, { new: true, arrayFilters }).exec();
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
    console.log(`error in activating environment version: ${err}`);
		return {
			error: {
        statusCode: constants.statusCodes.ise
      }			
		};
	}
}
//---------------------------------------
// applications and databases are arrays of shape ({ name: string, version: number})
/*
  This is a big one but don't panic. We know what we're doing.
  1. Find the Environment (and populate its provider for validation: new provider should be different from the existing one)
  2. Find the new Provider
  3. Find all the Applications and populate the specified version of them for the existing Environment 
  4. Find all the Databases    and populate the specified version of them for the existing Environment 
  5. Create a new Environment and set its provider to the one found in step 2
  6. Loop through all the Applications found in step 3 and create a clone of them (details explained in the body)
  7. Loop through all the Databases    found in step 4 and create a clone of them (details explained in the body)

  Note: The steps 3 and 4, also the steps 6 and 7 can (should) be executed at the same time, I don't do it now cause it's already messy and I'm behind the schedule....
*/
async function clone(accountId, userId, environmentName, newEnvironmentName, newProvider, { applications, databases }) {
	try {
		// Check if such version for such application exists
		const environmentFilter = { accountId, name: environmentName };
		const environment = await this.findOne(environmentFilter, { status: 0, lock: 0 })
			.populate('provider', 'displayName')
			.exec();
		if (environment == null) {
			return {
				success: false,
				message: `environment ${environmentName} not found`
			};
		}

		// todo: check the new provider is not the same as this environment's provider

		const provider = await ProviderModel.findOne(
			{ accountId: new ObjectId(accountId), displayName: newProvider },
			{ _id: 1 }
		).exec();

		if (!provider) {
			return {
				success: false,
				message: `provider ${newProvider} not found`
			};
		}

		const appsWithVersion = await Promise.all(
			applications.map((app) => {
				const applicationsFilter = { environment: environment._id, name: app.name };
				return ApplicationModel.findOne(applicationsFilter, {
					_id: 1,
					name: 1,
					description: 1,
					kind: 1,
					versions: 1
				})
					.populate({
						path: 'versions',
						match: { version: app.version },
						select: '-_id -version -fromVersion -variables -createdAt -createdBy -deployedBy -isActivated -deployedAt'
					})
					.exec();
			})
		);

		const databasesWithVersion = await Promise.all(
			databases.map((db) => {
				const databasesFilter = { environment: environment._id, name: db.name };
				return DatabaseModel.findOne(databasesFilter, {
					_id: 1,
					name: 1,
					description: 1,
					kind: 1,
					versions: 1
				})
					.populate({
						path: 'versions',
						match: { version: db.version },
						select: '-_id -version -fromVersion -variables -createdAt -createdBy -deployedBy -isActivated -deployedAt'
					})
					.exec();
			})
		);

		let newEnvironment = Object.assign({}, environment.toJSON());
		delete newEnvironment._id;
		newEnvironment.name = newEnvironmentName;
		newEnvironment.provider = ObjectId(provider._id);

		// Save the environment and keep its id
		const newEnvDoc = new this(newEnvironment);
		let newEnvironmentId = await newEnvDoc.save();

		/*
      1. Create a new Application (keep the id: newAppId)
      2. Create a new Application Version (use newAppId and keep the id: newAppVersionId)
      3. Add the new Application Version to the versions of the Application (use newAppVersionId)
    */
		const saveNewApp = async (app) => {
			let newApp = Object.assign({}, app);
			delete newApp.versions;
			delete newApp._id;
			newApp.environment = newEnvironmentId;
			// Save the environment and get its id
			const newAppDoc = new ApplicationModel(newApp);
			let newAppSaved = await newAppDoc.save();

			let newAppVersion = Object.assign({}, app.versions[0]);
			delete newAppVersion._id;
			newAppVersion.environmentApplication = newAppSaved;
			newAppVersion.createdBy = ObjectId(userId);

			const newAppVersionDoc = new ApplicationVersionModel(newAppVersion);
			let newAppVersionSaved = await newAppVersionDoc.save();

			const filter = { _id: newAppSaved._id };
			const update = {
				$push: {
					versions: newAppVersionSaved
				}
			};
			await ApplicationModel.findOneAndUpdate(filter, update, { new: true }).exec();

			return {
				newApp,
				newAppVersion
			};
		};

		/*
      1. Create a new Database (keep the id: newDatabaseId)
      2. Create a new Database Version (use newDatabaseId and keep the id: newDatabaseVersionId)
      3. Add the new Database Version to the versions of the Database (use newDatabaseVersionId)
    */
		const saveNewDatabase = async (db) => {
			let newDatabase = Object.assign({}, db);
			delete newDatabase.versions;
			delete newDatabase._id;
			newDatabase.environment = newEnvironmentId;
			// Save the environment and get its id
			const newDatabaseDoc = new DatabaseModel(newDatabase);
			let newDatabaseSaved = await newDatabaseDoc.save();

			let newDatabaseVersion = Object.assign({}, db.versions[0]);
			delete newDatabaseVersion._id;
			newDatabaseVersion.environmentDatabase = newDatabaseSaved;
			newDatabaseVersion.createdBy = ObjectId(userId);

			const newDatabaseVersionDoc = new DatabaseVersionModel(newDatabaseVersion);
			let newDatabaseVersionSaved = await newDatabaseVersionDoc.save();

			const filter = { _id: newDatabaseSaved._id };
			const update = {
				$push: {
					versions: newDatabaseVersionSaved
				}
			};
			await DatabaseModel.findOneAndUpdate(filter, update, { new: true }).exec();

			return {
				newDatabase,
				newDatabaseVersion
			};
		};

		// Loop through all the applications and save a clone of them for the new environment
		await Promise.all(
			appsWithVersion.map((app) => {
				return saveNewApp(app.toJSON());
			})
		).catch((e) => console.log(e.message));

		// Loop through all the databases and save a clone of them for the new environment
		await Promise.all(
			databasesWithVersion.map((db) => {
				return saveNewDatabase(db.toJSON());
			})
		).catch((e) => console.log(e.message));

		return {
			success: true
		};
	} catch (err) {
		console.log(`error:`, err.message);
		return {
			success: false,
			message: err.message
		};
	}
}
//---------------------------------------
async function setEnvironmentState(accountId, environmentName, stateCode , jobId = null) {
    const runQuery = async () => {
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

      if(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed'].includes(stateCode) && jobId) {
        await EnvironmentDeploymentModel.findOneAndUpdate({
          accountId ,
          environmentName ,
          jobId
        } , { state: stateCode }).exec();
      }
  
      const filter = { // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
          accountId: new ObjectId(accountId),
          name: environmentName,
          'state.code': { $in: validCurrentState }
      };
      const update = {
        $set: { 'state.code': stateCode }
      }
      return await EnvironmentV2Model.findOneAndUpdate(filter, update, { new: true }).exec();
    };
    return await runQueryHelper(runQuery);
}
// --------------------------------------
async function setJobId(accountId, environmentName, jobId) {
	const filter = { 
		accountId: new ObjectId(accountId),
		name: environmentName,
	};
	const update = {
    	$set: { 'state.job': jobId }
    }
	return await EnvironmentV2Model.findOneAndUpdate(filter, update, { new: true }).exec();
}
//------------------------------------------------------------------------
async function verifyNsRecords(accountId, environmentName, credentials, region, bucketName) {
  try {
    const filter = {
      name: environmentName,
      accountId: ObjectId(accountId)
    };
    const environment = await EnvironmentV2Model.findOne(filter).exec();
    if (!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notFound,
          message: 'Environment not found!'
        }
      }
    }

    if (environment.isNsVerified) {
      return {
        success: true,
        outputs: {
          isNsVerified: true
        }
      }
    }

    const domainName = environment.domain.dns;

    const domain_ns_records = await dnsPromises.resolveNs(domainName);
    const resources = await AwsEnvironmentService.getEnvironmentResources(environmentName, credentials, region, bucketName, '[ns]')
    const our_ns_records = resources.outputs;
    domain_ns_records.sort();
    our_ns_records.sort();
    const isNsVerified =
      domain_ns_records.length === our_ns_records.length &&
      domain_ns_records.every((value, index) => value === our_ns_records[index]);

    if (isNsVerified) {
			const update = { $set: { isNsVerified: true } };
			await EnvironmentV2Model.findOneAndUpdate(filter, update).exec();
      return {
        success: true,
        outputs: {
          isNsVerified: true
        }
      }
    } else {
      return {
        success: true,
        outputs: {
          isNsVerified: false
        }
      }
    }
  } catch (error) {
    logger.error(`Error in verifying ns records: ${error.message}`);
    return {
      success: true,
      outputs: {
        isNsVerified: false
      }
    };
  }
}