const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const KubernetesClusterModel = require('./kubernetesCluster');
const EnvironmentModel = require('../environment/environment')
const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const KubernetesClusterVersion = require('./kubernetesClusterVersion');
const EKS = require('./eks');
const timeService = require('../../../services/time.service');
const { config } = require('../../../utils/config');
const queueService = require('../../../queue');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job')
const job = new Job()

module.exports = {
	createEKS,
	addEKS,
	updateEKS,
	listKubernetesClusters,
	listKubernetesClusterVersions,
	getKubernetesClusterDetails,
	listAccountKubernetesClusters,
	getKind,
	activate,
	tfActionKubernetes,
	getDetails,
	setState,
	deleteKubernetesCluster,
  getKubernetesClusterResources
};
//---------------------------------------------------------
async function createEKS(environmentId, clusterVersion) {
	let step = 0;
	let eksId;
	try {
		const newEKS = {
			environment: environmentId,
			name: clusterVersion.eks_cluster_name,
			kind: constants.kubernetesClusterKinds.eks
		};
		const cluster = new KubernetesClusterModel(newEKS);
		await cluster.save();
		step++;

		clusterVersion.kubernetesCluster = cluster._id;

		const doc = new EKS(clusterVersion);
		await doc.save();
		step++;

		eksId = doc._id;

		const filter = { _id: cluster._id };
		const update = {
			$push: {
				versions: eksId
			}
		};
		const updated = KubernetesClusterModel.findOneAndUpdate(filter, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true,
      outputs: { version: doc.version }
		};
	} catch (err) {
		console.error(`error: `, err.message, '  rolling back');
		try {
			if (step > 1) {
				// rollback the second part (kubernetes cluster version insert)
				await EKS.findOneAndDelete({ _id: eksId }).exec();
			}
			if (step > 0) {
				// rollback the first part (kubernetes cluster insert)
				await KubernetesClusterModel.findOneAndDelete({
					environment: environmentId,
					name: clusterVersion.eks_cluster_name
				}).exec();
			}
		} catch (e) {
			// TODO: do something about it. if we go inside this, we'll have data inconsistency
			console.error(`failed to rollback adding the cluster ${clusterVersion.eks_cluster_name}`);
			let message = err.message;
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.ise,
          message
        }
      }
		}
		let message = err.message;
		if (err.code && err.code === 11000) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badReqest,
          message: constants.errorMessages.models.duplicate
        }
      }		
    }
		return {
			success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message
      }
    }
	}
}
//---------------------------------------------------------
async function addEKS(environmentId, clusterVersion) {
	let step = 0;
	let clusterId;
	try {
		// Check if the environment database exists (get it's _id)
		const filter = {
			environment: environmentId,
			name: clusterVersion.eks_cluster_name
		};
		const cluster = await KubernetesClusterModel.findOne(filter, { _id: 1 }).exec();
		if (cluster == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}
		// Check if an database-version with the specified version exists for this environment database
		const clusterVersionFilter = {
			kubernetesCluster: cluster._id,
			version: clusterVersion.fromVersion
		};
		const exClusterVersion = await KubernetesClusterVersion.findOne(clusterVersionFilter, { _id: 1 }).exec();
		if (exClusterVersion == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}
		// Find the biggest version for this environment database
		const maxFilter = {
			kubernetesCluster: cluster._id
		};
		const max = await KubernetesClusterVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
		if (max == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}

		// Increase the version by 1 and add the new database version
		clusterVersion.kubernetesCluster = cluster._id;
		clusterVersion.version = max.version + 1;

		const doc = new EKS(clusterVersion);
		await doc.save();
		step++;

		clusterId = doc._id;

		// Push the version to the environment database versions
		const update = {
			$push: {
				versions: clusterId
			}
		};
		const updated = KubernetesClusterModel.findOneAndUpdate({ _id: cluster._id }, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true,
      outputs: { version: doc.version }
		};
	} catch (err) {
		console.error(`error: `, err.message);
		try {
			if (step > 1) {
				// rollback the database version insert
				await EKS.findOneAndDelete({ _id: clusterId }).exec();
			}
		} catch (e) {
			let message = err.message;
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.ise,
          message
        }
      }
		}
		let message = err.message;
		if (err.code && err.code === 11000) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badReqest,
          message: constants.errorMessages.models.duplicate // This might happen if two people add new version at the very same time and the new version becomes equal for both!!!
        }
      }
		}
		return {
			success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message
      }
    }
	}
}
//---------------------------------------------------------
async function updateEKS(environmentId, clusterVersion) {
	const runQuery = async () => {
		const filter = {
			environment: environmentId,
			name: clusterVersion.eks_cluster_name
		};
		const cluster = await KubernetesClusterModel.findOne(filter, { _id: 1 }).exec();

		if (!cluster) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}

		// If an database-version with the specified version which has never been activated exists for this environment database update it
		const clusterVersionFilter = {
			kubernetesCluster: cluster._id,
			version: clusterVersion.version,
			isActivated: false
		};

		return await EKS.findOneAndUpdate(clusterVersionFilter, clusterVersion, { new: true }).exec();
	};

  const extractOutput = (outputs) => {
    return {
      version: outputs.version
    }
  }

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listKubernetesClusters(environmentId) {
	const runQuery = async () => {
		const filter = { environment: { $in: environmentId } };
		return await KubernetesClusterModel.find(filter, { name: 1, kind: 1, activeVersion: 1, state: 1 })
			.populate('environment', 'name')
			.exec();
	};
	const extractOutput = (result) => [
		...result.map((cluster) => ({
			id: cluster._id,
			state: cluster.state,
			name: cluster.name,
			kind: cluster.kind,
			activeVersion: cluster.activeVersion,
			environmentName: cluster.environment.name
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listKubernetesClusterVersions(environmentId, clusterName) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: clusterName };
		return await KubernetesClusterModel.findOne(filter, { _id: 1 })
			.populate('versions', 'version fromVersion createdAt isActivated')
			.exec();
	};

	const extractOutput = (result) => [
		...result.versions.map((cluster) => ({
			version: cluster.version,
			fromVersion: cluster.fromVersion,
			kind: cluster.kind,
			createdAt: cluster.createdAt,
			isActivated: cluster.isActivated
		}))
	];

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function getKubernetesClusterDetails(environmentId, clusterName, version) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: clusterName };
		const cluster = await KubernetesClusterModel.findOne(filter, { _id: 1, name: 1, 'state.code': 1 })
			.populate({
				path: 'versions',
				select: 'version',
				match: { version }
			})
			.exec();
		if (cluster == null || cluster.versions.length === 0) {
			return;
		}
		const clusterVersion = await KubernetesClusterVersion.findOne({ _id: cluster.versions[0]._id } , { _id: 0, __v: 0 })
			.populate('createdBy', 'username -_id')
			.exec();
		if(clusterVersion == null) {
			return;
		}
		return {
			...clusterVersion.toObject(),
			name: cluster.name,
			state: cluster.state
		};
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listAccountKubernetesClusters(accountId) {
	const runQuery = async () => {
		return await KubernetesClusterModel.aggregate([
			{
				$lookup: {
					from: 'environment_v2',
					localField: 'environment',
					foreignField: '_id',
					as: 'cluster_with_env'
				}
			},
			{
				$match: {
					'cluster_with_env.accountId': ObjectId(accountId)
				}
			},
			{
				$unwind: '$cluster_with_env'
			},
			{
				$project: {
					id: 1,
					state: 1,
					name: 1,
					kind: 1,
					activeVersion: 1,
					deployedVersion: 1,
					environmentName: '$cluster_with_env.name',
				}
			}
		]);
	};
	const extractOutput = (result) => [
		...result.map((cluster) => ({
			id: cluster._id,
			state: cluster.state,
			name: cluster.name,
			kind: cluster.kind,
			activeVersion: cluster.activeVersion,
			deployedVersion: cluster.deployedVersion,
			environmentName: cluster.environmentName
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function getKind(environmentId, clusterName) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: clusterName };
		return await KubernetesClusterModel.findOne(filter, { kind: 1, activeVersion: 1, state: 1, deployedVersion: 1 }).exec();
	};

	const extractOutput = (result) => ({
		kind: result.kind,
		activeVersion: result.activeVersion,
    state: result.state,
    deployedVersion: result.deployedVersion
	});

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function activate(userId, environmentId, clusterName, version) {
	const runQuery = async () => {
		const filter = { environment: new ObjectId(environmentId), name: clusterName, activeVersion: { $ne: version } };
		const doc = await KubernetesClusterModel.findOne(filter).populate('versions', 'version').exec();

		if (doc == null || !doc.populated('versions')) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}

		const exists = doc.versions.findIndex((v) => v.version === version) !== -1;
		if (!exists) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: "This version does not exist"
        }
      }
		}

		// Now that it exists, update it
		const update = {
			activeVersion: version,
			activatedAt: timeService.now(),
			activatedBy: userId
		};
		const updated = await KubernetesClusterModel.findByIdAndUpdate(doc._id, update, { new: true }).exec();
		if (!updated) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.ise,
          message: 'Failed to update kubernetes cluster'
        }
      }
		}
		// Update the status of the database version
		const clusterVersionFilter = { kubernetesCluster: doc._id, version };
		const clusterVersionUpdate = { isActivated: true };
		const updatedClusterVersion = await KubernetesClusterVersion.findOneAndUpdate(clusterVersionFilter, clusterVersionUpdate, { new: true }).exec();
		if (updatedClusterVersion == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.ise,
          message: 'Failed to update kubernetes cluster version'
        }
      }
		}
		return updatedClusterVersion;
	};

	return await runQueryHelper(runQuery);
}
//-----------------------------
async function tfActionKubernetes(action, accountId, userId, environmentId, environmentName, clusterName, credentials, providerDetails, variables, headers, version = null) {

  if(action == 'deploy') {
    const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
    if(!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notAllowed,
          message: 'The intended environment must be deployed to be able to deploy the Kubernetes cluster'
        }
      }
    }
  }

	let clusterKind = '',
		activeVersion;

	const clusterKindResult = await getKind(environmentId, clusterName);
	if (!clusterKindResult.success) {
    return {
			success: false,
      error: {
        statusCode: constants.statusCodes.badRequest,
        message: constants.errorMessages.models.elementNotFound
      }
    }
	}
	clusterKind = clusterKindResult.outputs.kind;
	activeVersion = clusterKindResult.outputs.activeVersion;

	const jobPaths = {
		dryRun: {
			[constants.kubernetesClusterKinds.eks]: constants.jobPaths.dryRunKubernetesEksCluster
		},
		deploy: {
			[constants.kubernetesClusterKinds.eks]: constants.jobPaths.deployKubernetesEksCluster
		},
		destroy: {
			[constants.kubernetesClusterKinds.eks]: constants.jobPaths.destroyKubernetesEksCluster
		}
	};

	const jobPath = jobPaths[action][clusterKind];
	if (!jobPath) {
		console.error('invalid kubernetes cluster kind');
		return {
			success: false,
			error: {
				message: 'invalid kubernetes cluster kind',
				statusCode: constants.statusCodes.badRequest
			}
		}
	}

	const cluster = await KubernetesClusterModel.findOne({ environment: environmentId, name: clusterName }, {_id: 0, __v: 0, versions: 0});
	if(!cluster) {
		return {
			success: false,
			error: {
				message: constants.errorMessages.models.elementNotFound,
				statusCode: constants.statusCodes.badRequest
			}
		}
	}

	// If the action is deploy or destroy, ignore the version and just use activeVersion and deployedVersion
	// If the action is dry-run, use the version sent by user, if not provided just use the activeVersion
	const targetVersion = (action === 'destroy') ? cluster.deployedVersion : ( action === 'deploy'|| !version ) ? activeVersion : version;
	const clusterVersionResult = await getDetails(environmentId, clusterName, targetVersion);

  let clusterVersion

	if(!clusterVersionResult.success) {
		return {
			success: false,
			error: {
				message: constants.errorMessages.models.elementNotFound,
				statusCode: constants.statusCodes.badRequest
			}
		}
	} else {
    clusterVersion = clusterVersionResult.outputs
  }

  console.log(JSON.stringify(clusterVersion, null, 2))

	const message = {
		jobPath,
		jobDetails: {
			userId,
			accountId,
			details: {
				environmentName,
        variables,
				providerDetails,
				credentials,
				...cluster.toObject(),
				...clusterVersion
			}
		}
	};
	const options = {
		userId: message.jobDetails.userId,
		accountId: message.jobDetails.accountId,
		path: message.jobPath,
		jobDataBag: {
			environmentName,
			clusterName,
			variables,
			version: targetVersion
		}
	};
	try {
		if (action === 'deploy' || action === 'destroy') {
			// First we try to set the state code only to see if we can send the job or not
			const stateCode = {
				code: action === 'deploy' ? 'deploying' : 'destroying'
			};
			const setStateCodeResult = await setState(environmentId, clusterName, stateCode);

			if (!setStateCodeResult.success) {
        return {
          success: false,
          error: {
            stateCode: constants.statusCodes.badRequest,
            message: `Invalid action. Cluster state is ${cluster.state.code}.`
          }
        }
			}
		}
		const jobId = await queueService.sendMessage(config.queueName, message, options);
		if(action === 'deploy') {
			await KubernetesClusterModel.findOneAndUpdate({ environment: environmentId, name: clusterName }, {deployedVersion: targetVersion});
		}
		await setJobId(environmentId, clusterName, jobId);

		const jobNotification = {
		accountId: message.jobDetails.accountId,
		category: "infw",
		dataBag: {
			jobPath: message.jobPath,
			environmentName,
			clusterName,
			status: 'created',
			jobId
		}
		}
		
		const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config);

		return {
			success: true,
      outputs: { jobId }
		};
	} catch (error) {
		console.log(`error: ${error.message}`);
    return {
			success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message: 'Failed to schedule job.'
      }
    }
	}
}
//-----------------------------
async function getDetails(environmentId, clusterName, version = null) {
	const runQuery = async () => {
		let clusterFilter = { environment: environmentId, name: clusterName };
		if (!version) {
			// If the version is not specified we find the active version of the application
			clusterFilter.activeVersion = { $exists: true };
		}
		const doc = await KubernetesClusterModel.findOne(clusterFilter, { activeVersion: 1, state: 1, kind: 1 })
			.populate('environment', 'region hostedZone domain')
			.exec();

		if (doc == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
    }

		const filter = { kubernetesCluster: doc._id, version: version ? version : doc.activeVersion };
		let cluster;
		switch (doc.kind) {
			case constants.kubernetesClusterKinds.eks:
				cluster = await KubernetesClusterVersion.findOne(filter, {_id: 0, __v: 0}).exec();
		}
		if (cluster == null) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
    }

		let result = cluster.toJSON();
		result.region = doc.environment.region;
		result.hostedZone = doc.environment.hostedZone;
		result.domain = doc.environment.domain;
    result.activeVersion = doc.activeVersion;
    result.state = doc.state;
		return result;
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function setState(environmentId, clusterName, state) {
	const runQuery = async () => {
		const stateCode = state.code;
		let validCurrentState = [];
		switch (stateCode) {
			case 'destroyed':
			case 'destroy_failed':
				validCurrentState = [ 'destroying' ];
				break;
			case 'deployed':
			case 'deploy_failed':
				validCurrentState = [ 'deploying' ];
				break;
			case 'destroying':
				validCurrentState = [ null, 'deployed', 'destroy_failed', 'deploy_failed' ];
				break;
			case 'deploying':
				validCurrentState = [ null, 'created', 'destroyed', 'destroy_failed', 'deploy_failed', 'deployed' ];
				break;
		}
		const filter = {
			// Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
			environment: environmentId,
			name: clusterName,
			'state.code': { $in: validCurrentState }
		};
		return await KubernetesClusterModel.findOneAndUpdate(filter, { state }, { new: true }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
// --------------------------------------
async function setJobId(environmentId, clusterName, jobId) {
  const filter = { 
    environment: environmentId,
    name: clusterName,
  };
  const update = {
    $set: {"state.job": jobId }
  }
  return await KubernetesClusterModel.findOneAndUpdate(filter, update, { new: true }).exec();
}
//-----------------------------
async function deleteKubernetesCluster(userId, environmentId, clusterName) {
	const runQuery = async () => {
		// Check if such version for such application exists
		const filter = { environment: new ObjectId(environmentId), name: clusterName };
		const doc = await KubernetesClusterModel.findOne(filter).exec();

		if (doc == null) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}
		// TODO: This is just the basic condition for now, has to be refined later as we use the database and figure out the common usage patterns
		let canDelete = false;
		if (doc.state.code === 'destroyed' || doc.state.code === 'created' || !doc.activeVersion) {
			canDelete = true;
		}
		if (!canDelete) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: 'Cannot delete the kubernetes cluster, it needs to be destroyed first'
        }
      }
		}
		const clusterVersionFilter = { kubernetesCluster: doc._id };
		await KubernetesClusterVersion.deleteMany(clusterVersionFilter).exec();
		await KubernetesClusterModel.findByIdAndDelete(doc._id).exec();
		return {
			success: true
		};
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}

async function getKubernetesClusterResources(environmentName, clusterName, credentials, region, bucketName, fields) {
  AWS.config.update({
		region,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey
	});
	const s3 = new AWS.S3({
		apiVersion: awsApiVersions.s3
	});

  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
      Key: `utopiops-water/kubernetesClusters/environment/${environmentName}/cluster/${clusterName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));
  
    if (fields === '[*]') { //Sending response based on fields query
      return {
        success: true,
        outputs: state
      };
    }
		else if(fields === '[eks_cluster_name]') {
			return {
				success: true,
				outputs: state.outputs.eks_cluster_name.value
			}
		}

    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
		if (err.code === 'NoSuchKey') {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: 'NoSuchKey'
        }
      }
		}
    return {
      success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message: err.message
      }
    }
  }
}