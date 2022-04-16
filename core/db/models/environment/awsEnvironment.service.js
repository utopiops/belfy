'use strict';
const constants = require('../../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const EnvironmentV2Model = require('./environment');
const mongoose = require('mongoose');
const {	updateVersion, cloneVersion } = require('./environmentVersion.service')
const { runQueryHelper } = require('../helpers');
const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');

module.exports = {
	addAlb,
	deleteAlb,
	addNlb,
	deleteNlb,
	addListenerToAlb,
	deleteAlbListener,
	updateAlbListenerCertificate,
	listAlbs,
	addEcsCluster,
	addEcsInstanceGroup,
	updateEcsInstanceGroup,
	deleteEcsCluster,
	deleteEcsInstanceGroup,
	listEcsClusters,
	updateEcsClusterDependencies,
	getEnvironmentResources,
	setAlbWaf,
	listEnvironmentsWithHostedZone,
  addOrUpdateSchedule,
  deleteSchedule,
  getSchedule
};

///------------------- alb
async function addAlb(accountId, environmentName, version, isAdd, displayName, is_internal, enable_waf) {
	console.log(`addAlb params`, accountId, environmentName, version, isAdd, displayName);
	const albName = uuid().substr(0, 32); // I assume this will always result in a unique name for ALBs in an environment
	const kind = constants.cloudProviders.aws;
  const update = {
		$push: {
			'versions.$[i].albList': {
				name: albName,
				displayName,
        is_internal: is_internal == true,
				enable_waf: enable_waf == true
			}
		}
	};
	return await updateVersion(accountId, environmentName, {}, update, version, isAdd, true, kind);
}
//-----------
async function deleteAlb(accountId, environmentName, version, isAdd, albName) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				'albList.displayName': albName
			}
		}
	};
	const update = {
		$pull: {
			'versions.$[i].albList': { displayName: albName }
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//-----------
async function setAlbWaf(accountId, environmentName, version, isAdd, alb_waf) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false
			}
		}
	};
	const update = {
		$set: {
			"versions.$[i].alb_waf": alb_waf
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//------------
async function addListenerToAlb(accountId, environmentName, version, isAdd, albName, port, protocol, certificateArn) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				albList: { 
          $elemMatch: { 
            displayName: albName,
            'listenerRules.port': { $ne: Number(port) }
          }
        }
			}
		}
	};
	const listener = {
		port: Number(port),
		protocol,
		certificateArn
	};
	const update = {
		$push: { 'versions.$[i].albList.$[j].listenerRules': listener }
	};
	const extras = {
		updateExtras: {
			arrayFilters: [ { 'j.displayName': albName, 'j.listenerRules.port': { $ne: Number(port) } } ]
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, extras);
}
//-----------
async function updateAlbListenerCertificate(accountId, environmentName, version, isAdd, albName, port, certificateArn) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				albList: {
					$elemMatch: {
						displayName: albName,
						listenerRules: {
							$elemMatch: {
								protocol: 'HTTPS',
								port: Number(port)
							}
						}
					}
				}
			}
		}
	};
	const update = {
		$set: {
			'versions.$[i].albList.$[alb].listenerRules.$[rule].certificateArn': certificateArn
		}
	};
	const updateExtras = {
		arrayFilters: [ { 'alb.displayName': albName }, { 'rule.protocol': 'HTTPS', 'rule.port': Number(port) } ],
		multi: false
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, { updateExtras });
}
//-----------
async function listAlbs(accountId, environmentName, version) {
	const runQuery = async () => {
		const filter = {
			accountId: new ObjectId(accountId),
			name: environmentName,
			versions: { $elemMatch: { version: version } }
		};
		return await EnvironmentV2Model.findOne(filter, { _id: 0, 'versions.$': 1 }).exec();
	};
	const extractOutput = (result) => ({
		albList: result.versions[0].albList
	});
	return await runQueryHelper(runQuery, extractOutput);
}

///----------------- nlb
async function addNlb(accountId, environmentName, version, isAdd, displayName, is_internal) {
	const nlbName = uuid().substr(0, 32); // I assume this will always result in a unique name for NLBs in an environment
  const kind = constants.cloudProviders.aws;
  const update = {
		$push: {
			'versions.$[i].nlbList': {
				name: nlbName,
				displayName,
				is_internal
			}
		}
	};
	const isRaw = true;
	return await updateVersion(accountId, environmentName, {}, update, version, isAdd, isRaw, kind);
}
//-----------
async function deleteNlb(accountId, environmentName, version, isAdd, nlbName) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				'nlbList.displayName': nlbName
			}
		}
	};
	const update = {
		$pull: {
			'versions.$[i].nlbList': { displayName: nlbName }
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//-----------
async function deleteAlbListener(accountId, environmentName, version, isAdd, albName, port) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				albList: { 
          $elemMatch: { 
            displayName: albName,
            'listenerRules.port': Number(port)
          } 
        }
			}
		}
	};
	const update = {
		$pull: { 'versions.$[i].albList.$[j].listenerRules': { port: Number(port) } }
	};
	const extras = {
		updateExtras: {
			arrayFilters: [ { 'j.displayName': albName } ]
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, extras);
}

///----------------- ecs cluster
async function addEcsCluster(accountId, environmentName, version, isAdd, displayName) {
	const clusterName = uuid().substr(0, 32); // I assume this will always result in a unique name for ecsCluster in an environment
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				ecsClusterList: {
					$not: {
						$elemMatch: {
							displayName
						}
					}
				}
			}
		}
	};
	const cluster = {
		displayName,
		name: clusterName
	};
	const update = {
		$push: { 'versions.$[i].ecsClusterList': cluster }
	};

	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//-----------
async function addEcsInstanceGroup(accountId, environmentName, version, isAdd, clusterName, instanceGroup) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				ecsClusterList: {
					$elemMatch: {
						displayName: clusterName,
						instanceGroups: {
							$not: {
								$elemMatch: {
									displayName: instanceGroup.displayName
								}
							}
						}
					}
				}
			}
		}
	};
	instanceGroup.name = uuid();
	const update = {
		$push: {
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups': instanceGroup
		}
	};
	const updateExtras = { arrayFilters: [ { 'ecs.displayName': clusterName } ] };
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, { updateExtras });
}
//----------
async function updateEcsInstanceGroup(accountId, environmentName, version, isAdd, clusterName, instanceGroupName, instanceGroup) {
	const isRaw = true;
	const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				ecsClusterList: {
					$elemMatch: {
						displayName: clusterName,
						instanceGroups: {
							$elemMatch: {
								displayName: instanceGroupName
							}
						}
					}
				}
			}
		}
	};

	const update = {
		$set: {
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].kind': instanceGroup.kind,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].count': instanceGroup.count,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].minSize': instanceGroup.minSize,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].maxSize': instanceGroup.maxSize,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].instances': instanceGroup.instances,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].rootVolumeSize': instanceGroup.rootVolumeSize,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].keyPairName': instanceGroup.keyPairName,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].labels': instanceGroup.labels,
			'versions.$[i].ecsClusterList.$[ecs].instanceGroups.$[isg].isSpot': instanceGroup.isSpot,
		}
	};
	const updateExtras = { arrayFilters: [ { 'ecs.displayName': clusterName}, {'isg.displayName': instanceGroupName } ] };
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, { updateExtras });
}
//----------
async function deleteEcsCluster(accountId, environmentName, version, isAdd, clusterName) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				isActivated: { $ne: true },
				version: Number(version),
				ecsClusterList: { $elemMatch: { displayName: clusterName } }
			}
		}
	};
	const update = {
		$pull: { 'versions.$[i].ecsClusterList': { displayName: clusterName } }
	};

	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//----------
async function deleteEcsInstanceGroup(accountId, environmentName, version, isAdd, clusterName, igName) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				ecsClusterList: { $elemMatch: { displayName: clusterName, instanceGroups: { $elemMatch: { displayName: igName } } } }
			}
		}
	};

	const update = {
		$pull: { 'versions.$[i].ecsClusterList.$[j].instanceGroups': { displayName: igName } }
	};
	const extras = {
		updateExtras: {
			arrayFilters: [ { 'j.displayName': clusterName } ]
		}
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, extras);
}
//----------
async function listEcsClusters(accountId, environmentName, version) {
	const runQuery = async () => {
		const filter = {
			accountId: new ObjectId(accountId),
			name: environmentName,
			versions: { $elemMatch: { version: version } }
		};
		return await EnvironmentV2Model.findOne(filter, { _id: 0, 'versions.$': 1 }).exec();
	};
	const extractOutput = (result) => ({
		ecsClusterList: result.versions[0].ecsClusterList
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//----------
// todo: we have not dependencies any more, delete this function 
async function updateEcsClusterDependencies(accountId, environmentName, version, isAdd, clusterName, dependencies) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				'ecsClusterList.displayName': clusterName
			}
		}
	};
	const update = {
		$set: {
			'versions.$[i].ecsClusterList.$[ecs].dependencies': dependencies
		}
	};
	const updateExtras = { arrayFilters: [ { 'ecs.displayName': clusterName } ] };
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, { updateExtras });
}
//----------
async function addOrUpdateSchedule(accountId, environmentName, version, isAdd, start_schedule, stop_schedule) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
	const update = {
    $set: {
      'versions.$[i].start_schedule': start_schedule,
      'versions.$[i].stop_schedule': stop_schedule
    }
	};
	return await updateVersion(accountId, environmentName, {}, update, version, isAdd, isRaw, kind);
}
//----------
async function deleteSchedule(accountId, environmentName, version, isAdd) {
	const isRaw = true;
  const kind = constants.cloudProviders.aws;
  const filter = {
		versions: {
			$elemMatch: {
				version: Number(version),
				isActivated: false,
				start_schedule: { $exists: true },
				stop_schedule: { $exists: true }
			}
		}
	};
	const update = {
    $unset: {
      'versions.$[i].start_schedule': "",
      'versions.$[i].stop_schedule': ""
    }
	};
	return await updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind);
}
//----------
async function getSchedule(accountId, environmentName, version) {
	const runQuery = async () => {
		const filter = {
			accountId: new ObjectId(accountId),
			name: environmentName,
			versions: {
        $elemMatch: {
          version: version,
          start_schedule: { $exists: true },
          stop_schedule: { $exists: true }
        }
      }
		};
		return await EnvironmentV2Model.findOne(filter, { _id: 0, 'versions.$': 1 }).exec();
	};
	const extractOutput = (result) => ({
		start_schedule: result.versions[0].start_schedule,
		stop_schedule: result.versions[0].stop_schedule
	});
	return await runQueryHelper(runQuery, extractOutput);
}
//----------
async function getEnvironmentResources(environmentName, credentials, region, bucketName, fields) {
	AWS.config.update({
		region: region,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey
	});
	const s3 = new AWS.S3({
		apiVersion: awsApiVersions.s3
	});
	try {
		const params = {
			Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker
			Key: `utopiops-water/applications/environment/${environmentName}`
		};
		const resp = await s3.getObject(params).promise();
		const state = JSON.parse(resp.Body.toString());
    
		if (fields === '[*]') {
			return {
				success: true,
				outputs: state
			};
		}
		else if (fields === '[ns]') {
			return {
				success: true,
				outputs: state.outputs.env_name_servers.value
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
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: false
		};
	}
}

// other
async function listEnvironmentsWithHostedZone(accountId) {
	const runQuery = async () => {
		const filter = {
			accountId: new ObjectId(accountId),
			$or: [ { 'hostedZone.isOwn': true }, { 'hostedZone.isCrossAccount': false }, { 'domain.create': true } ]
		};
		return await EnvironmentV2Model.find(filter, { _id: 0, hostedZone: 1, name: 1, domain: 1 }).exec();
	};
	const extractOutput = (result) => ({
		environments: result.map((e) => ({
			name: e.name,
			domainName: e.hostedZone ? e.hostedZone.name : e.domain.dns,
		}))
		
	});
	return await runQueryHelper(runQuery, extractOutput);
}