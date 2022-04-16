const config = require('../../../utils/config').config;
const constants = require('../../../utils/constants');
const { defaultLogger: logger } = require('../../../logger');
const queueService = require('../../../queue');
const yup = require('yup');
// const { DefaultAzureCredential } = require("@azure/identity");
// const { BlobServiceClient } = require("@azure/storage-blob");
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const ApplicationDeploymentModel = require('./applicationDeployment');
const applicationDeploymentService = require('./applicationDeployment.service');
const HttpService = require('../../../utils/http/index');    
const http = new HttpService();
const HttpConfig = require('../../../utils/http/http-config');
const { getInternalToken } = require('../../../services/auth');
const { alarmStatusValues } = require('../alarm_v2/alarmStatusValues');
const { runQueryHelper } = require('../helpers');
const ApplicationModel = require('./application');
const {getKubernetesClusterResources} = require('../kubernetes/kubernetesCluster.service');
const { createPipeline: createEksWebServicePipeline } = require('./eksWebServiceApplication.service');
const { createPipeline: createEksBackgroundJobPipeline } = require('./eksBackgroundJobApplication.service');
const EnvironmentService = require('../environment/environment.service');
const EnvironmentModel = require('../environment/environment');
const ObjectId = require('mongoose').Types.ObjectId;
const timeService = require('../../../services/time.service');
const ApplicationVersion = require('./applicationVersion');
const EcsApplication = require('./ecsApplication');
const EksBackgroundJobApplication = require('./eksBackgroundJobApplication');
const EksWebServiceApplication = require('./eksWebServiceApplication');
const ClassicBakedApplication = require('./classicBakedApplication');
const S3WebsiteApplication = require('./s3WebsiteApplication');
const AzureStaticWebsiteApplication = require('./azureStaticWebsiteApplication');
const Job = require('../job')
const job = new Job()

yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

const appQueName = config.queueName;

// declarations
exports.getApplicationResources = getApplicationResources;
exports.getAzureApplicationResources = getAzureApplicationResources;
exports.getApplicaitonSummary = getApplicaitonSummary;
exports.activateApplication = activateApplication;
exports.getForTf = getForTf;
exports.tfActionApplication = tfActionApplication;
exports.listApplicationVersions = listApplicationVersions;
exports.deleteApplication = deleteApplication;
exports.deleteDynamicApplication = deleteDynamicApplication;
exports.listApplications = listApplications;
exports.listApplicationsByRepoUrl = listApplicationsByRepoUrl;
exports.getApplicaitonVersionBranch = getApplicaitonVersionBranch;
exports.setState = setState;
exports.listDynamicApplications = listDynamicApplications;
exports.getApplicationKind = getApplicationKind;
exports.createPipeline = createPipeline;
exports.saveBuildTime = saveBuildTime;
exports.setApplicationJenkinsState = setApplicationJenkinsState;
exports.setDynamicApplicationJenkinsState = setDynamicApplicationJenkinsState;

// implementations
//-----------------------------------------
async function listApplications(accountId, environmentName) {
  let environmentIds = [];
  let result = await EnvironmentService.listEnvironmentIdsByAccount(accountId, environmentName);
  if (!result.success) {
    return result;
  } else {
    environmentIds = result.outputs.environmentIds.map((e) => e.id);
    if (!environmentIds.length) {
      // User doesn't have any environments, so no need to search for the environment databases
      return {
        success: true,
        outputs: [],
      };
    }
  }

  console.log(`environmentIds`, environmentIds);

  // Get the status and effects of the alarms of the applications

  let applicationsWithAlarms = await ApplicationModel.aggregate([
    {
      $match: {
        environment: { $in: environmentIds },
      },
    },
    {
      $lookup: {
        from: 'alarms',
        localField: '_id',
        foreignField: 'application',
        as: 'alarms',
      },
    },
    {
      $lookup: {
        from: 'environment_v2',
        localField: 'environment',
        foreignField: '_id',
        as: 'environment',
      },
    },
    {
      $unwind: '$environment',
    },
    {
      $project: {
        id: '$_id',
        name: 1,
        environmentName: '$environment.name',
        kind: 1,
        activeVersion: 1,
        deployedVersion: 1,
        'alarms.status': 1,
        'alarms.severity': 1,
        state: 1,
        _id: 0,
      },
    },
  ]);

  applicationsWithAlarms.forEach(function (value, index) {
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
  }, applicationsWithAlarms);

  return {
    success: true,
    outputs: applicationsWithAlarms,
  };
}
//-----------------------------------------
async function listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl) {
  const runQuery = async () => {
    const filter = { $or: [ { repositoryUrl: htmlUrl }, { repositoryUrl: cloneUrl }, { repositoryUrl: sshUrl } ] };
		return await ApplicationModel.find(filter).populate('environment', 'accountId name').exec();
	};

	const extractOutput = (result) => {
    return [...result.map(app => ({
			id: app._id,
      applicationName: app.name,
      environmentName: app.environment.name,
			jobName: app.jobName,
      repositoryUrl: app.repositoryUrl,
      deployedVersion: app.deployedVersion,
      accountId: app.environment.accountId,
      userId: app.activatedBy,
      isDynamicApplication: app.isDynamicApplication,
      dynamicNames: app.dynamicNames,
      stateCode: app.state.code,
		}))];
  };

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function getApplicaitonVersionBranch(environmentApplication, version) {
  const runQuery = async () => {
    const filter = { environmentApplication: new ObjectId(environmentApplication), version };
		const doc = await ApplicationVersion.findOne(filter, { branch: 1, outputPath: 1, buildCommand: 1 }).exec();
    return doc;
	};
  
  const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function tfActionApplication(action, accountId, userId, username, environmentId, environmentName, applicationName, body, credentials, providerDetails, domain, headers ) {

  const { region, bucketName, cloudProviderAccountId } = providerDetails;

  if(action == 'deploy') {
    const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
    if(!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notAllowed,
          message: 'The intended environment must be deployed to be able to deploy the application'
        }
      }
    }
  }

  const { variables = null, version = null } = body;

  let dynamicName = (variables || {}).dynamicName
  if (dynamicName) {
    dynamicName = dynamicName.toLowerCase() // we must always use lowercase for application names
    variables.dynamicName = dynamicName
    
    const result = await dynamicAction(accountId, environmentId, environmentName, applicationName, dynamicName, action)
    if (result.error) {
      return result
    }
  }

  const result = await getApplicationAndVersion(environmentId, applicationName, dynamicName, action, version)
  if (result.error) {
    return result
  }
  let application = result.outputs.application
  let applicationVersion = result.outputs.applicationVersion
  let applicationKind = application.kind;
  let activeVersion = application.activeVersion;
  let deployedVersion = application.deployedVersion;

  
  // if action is deploy or destroy the application is activated
  if (!activeVersion && ['deploy', 'destroy'].indexOf(action) != -1) {
    return {
      error: {
        statusCode: constants.statusCodes.badRequest,
        message: 'no active version found for this application'
      }
    };
  }

  if(action === 'deploy' && (applicationKind === constants.applicationKinds.eksWebService || applicationKind === constants.applicationKinds.eksBackgroundJob)) {
    try {
      const fields = '[eks_cluster_name]';
      const resource = await getKubernetesClusterResources(environmentName, applicationVersion.eks_cluster_name, credentials, region, bucketName, fields)
      const repositoryName = resource.outputs;

      if (activeVersion !== deployedVersion) {
        const appFilter = { environment: environmentId, name: applicationName };
        let update = { $set: { deployedVersion: activeVersion }}
        await ApplicationModel.findOneAndUpdate(appFilter, update).exec();
        await deletePipeline(environmentId, applicationName, headers);

        if(applicationKind === constants.applicationKinds.eksWebService) {
          await createEksWebServicePipeline(accountId, userId, environmentId, applicationName, region, cloudProviderAccountId, credentials, repositoryName, headers);
        } else {
          await createEksBackgroundJobPipeline(accountId, userId, environmentId, applicationName, region, cloudProviderAccountId, credentials, repositoryName, application.releaseName, headers);
        }      
      } else {

        AWS.config.apiVersions = {
          lambda: '2015-03-31'
        };
    
        AWS.config.update({
          region,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey
        });

        const ecrRegistryUrl = `${cloudProviderAccountId}.dkr.ecr.${region}.amazonaws.com`;
  
        let payload;
        if(applicationKind === constants.applicationKinds.eksWebService) {
          payload = {
            url: '/aws/app/create',
            method: 'POST',
            body: {
              appName: applicationName,
              domain: domain.dns,
              replicaCount: 1,
              ports: [
                {
                  name: "http",
                  containerPort: applicationVersion.port,
                  protocol: "TCP"
                }
              ],
              env: applicationVersion.environmentVariables,
              image: {
                "repository": `${ecrRegistryUrl}/${repositoryName}`,
                "pullPolicy": "Always",
                "tag": `\${GITSHA}`
              },
              healthPath: `${applicationVersion.health_check_path}`,
              resource: {
                limit: {
                  cpu: `${applicationVersion.cpu}`,
                  memory: `${applicationVersion.memory}Mi`
                },
                request: {
                  cpu: `${applicationVersion.cpu}`,
                  memory: `${applicationVersion.memory}Mi`
                }
              },
              service: {
                type: "ClusterIP",
                port: applicationVersion.port
              }
            }
          };
        }
        else if(applicationKind === constants.applicationKinds.eksBackgroundJob) {
          payload = {
            url: '/aws/back_job/create',
            method: 'POST',
            body: {
              appName: application.releaseName,
              replicaCount: 1,
              env: applicationVersion.environmentVariables,
              image: {
                "repository": `${ecrRegistryUrl}/${repositoryName}`,
                "pullPolicy": "IfNotPresent",
                "tag": `\${GITSHA}`
              },
              healthCommand: applicationVersion.health_check_command.split(' '),
              resource: {
                limit: {
                  cpu: `${applicationVersion.cpu}`,
                  memory: `${applicationVersion.memory}Mi`
                },
                request: {
                  cpu: `${applicationVersion.cpu}`,
                  memory: `${applicationVersion.memory}Mi`
                }
              }
            }
          };
        }
        console.log(payload);
        const lambda = new AWS.Lambda();
        const params = {
          FunctionName: `${repositoryName}_helm_manager_proxy`,
          InvocationType: 'RequestResponse',
          LogType: 'Tail',
          Payload: JSON.stringify(payload),
        };
      
        await lambda.invoke(params).promise();  
      }

      const deployment = {
        accountId,
        environmentName,
        applicationName,
        version: applicationVersion.version,
        deployer: username,
        action,
        state: `${action}ing`,
        externalDeployer: body.externalDeployer,
        commitId: body.commitId,
        pipelineId: body.pipelineId,
        pipelineJobId: body.pipelineJobId,
        releaseTag: body.releaseTag,
        releaseNotes: body.releaseNotes,
        pipelineLink: body.pipelineLink,
        variables
      }
      await applicationDeploymentService.add(deployment);

      return {
        success: true,
        outputs: constants.statusCodes.ok
      };

    } catch (error) {
      console.error(error.message);
      return {
        error: {
          statusCode: constants.statusCodes.ise,
          message: error.message
        }
      };
    }
  }

  if(action === 'destroy' && (applicationKind === constants.applicationKinds.eksWebService || applicationKind === constants.applicationKinds.eksBackgroundJob)) {
    try {
      const fields = '[eks_cluster_name]';
      const resource = await getKubernetesClusterResources(environmentName, applicationVersion.eks_cluster_name, credentials, region, bucketName, fields)
      const lambdaFunctionName = resource.outputs;
  
      AWS.config.apiVersions = {
        lambda: '2015-03-31'
      };
  
      AWS.config.update({
        region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      });

      let payload;
      if(applicationKind === constants.applicationKinds.eksWebService) {
        payload = {
          url: "/aws/app/delete",
          method: "POST",
          body: {
            appName: applicationName,
            domain: domain.dns,
          }
        };
      }
      else if(applicationKind === constants.applicationKinds.eksBackgroundJob) {
        console.log(application);
        payload = {
          url: "/aws/back_job/delete",
          method: "POST",
          body: {
            appName: application.releaseName
          }
        };
      }
      console.log(payload);
      const lambda = new AWS.Lambda();
      const params = {
        FunctionName: `${lambdaFunctionName}_helm_manager_proxy`,
        InvocationType: 'RequestResponse',
        LogType: 'Tail',
        Payload: JSON.stringify(payload),
      };
    
      await lambda.invoke(params).promise();

      await deletePipeline(environmentId, applicationName, headers);

      const state = {
        code: 'destroyed'
      }
      const filter = { // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
        environment: environmentId,
        name: applicationName
      };
      await ApplicationModel.findOneAndUpdate(filter, { $set: { jenkinsState: state, state } }, { new: true }).exec();
      return {
        success: true,
        outputs: constants.statusCodes.ok
      };
    } catch (error) {
      console.error(error.message);
      return {
        error: {
          statusCode: constants.statusCodes.ise,
          message: error.message
        }
      };
    }
  }

  // We set state before creating job to avoid deploying/destroying a job we should not as it's already being deployed/destroyed (order doesn't matter)
  try {
    if (action === 'deploy' || action === 'destroy') {
      const state = {
        code: action === 'deploy' ? 'deploying' : 'destroying'
      }
      const result = await setState(accountId, environmentId, applicationName, state, dynamicName);
      if (!result.success) {
        return {
          error: {
            statusCode: constants.statusCodes.badRequest,
            message: `Application is ${action}ing now. Please wait.`
          }
        };
      }
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: 'Failed to schedule the job!'
      }
    }
  }
  
  const jobPaths = {
    dryRun: {
      [constants.applicationKinds.ecs]: constants.jobPaths.dryRunApplicationEcsV4,
      [constants.applicationKinds.s3Website]: constants.jobPaths.dryRunApplicationS3WebsiteV4,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.dryRunApplicationClassicBakedV4,
      [constants.applicationKinds.azureStaticWebsite]: constants.jobPaths.dryRunApplicationAzureStaticWebsite
    },
    deploy: {
      [constants.applicationKinds.ecs]: constants.jobPaths.deployApplicationEcsV4,
      [constants.applicationKinds.s3Website]: constants.jobPaths.deployApplicationS3WebsiteV4,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.deployApplicationClassicBakedV4,
      [constants.applicationKinds.azureStaticWebsite]: constants.jobPaths.deployApplicationAzureStaticWebsite
    },
    destroy: {
      [constants.applicationKinds.ecs]: constants.jobPaths.destroyApplicationEcsV4,
      [constants.applicationKinds.s3Website]: constants.jobPaths.destroyApplicationS3WebsiteV4,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.destroyApplicationClassicBakedV4,
      [constants.applicationKinds.azureStaticWebsite]: constants.jobPaths.destroyApplicationAzureStaticWebsite
    },
  };

  const jobPath = jobPaths[action][applicationKind];
  if (!jobPath) {
    console.error("invalid application kind");
    return{
      error: {
        statusCode: constants.statusCodes.badRequest,
        message: 'invalid application kind'
      }
    };
  }

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        app_name: applicationName,
        runtime_variables: variables,
        providerDetails,
        credentials,
        ...applicationVersion.toObject(),
        isDynamicApplication: application.isDynamicApplication
      }
    }
  };

  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      applicationName,
      variables,
      version: applicationVersion.version,
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
        applicationName,
        status: 'created',
        jobId
      }
    }
    const httpConfig = new HttpConfig().withCustomHeaders(headers);
    await job.sendJobNotification(jobNotification, httpConfig.config);
    // Set the jobId in the state now that the message is sent
    await setJobId(environmentId, applicationName, jobId, dynamicName);
    

    const deployment = {
      accountId,
      environmentName,
      applicationName,
      version: applicationVersion.version,
      jobId,
      deployer: username,
      action,
      state: `${action}ing`,
      externalDeployer: body.externalDeployer,
      commitId: body.commitId,
      pipelineId: body.pipelineId,
      pipelineJobId: body.pipelineJobId,
      releaseTag: body.releaseTag,
      releaseNotes: body.releaseNotes,
      pipelineLink: body.pipelineLink,
      variables
    }
    await applicationDeploymentService.add(deployment);

    if (action == "deploy") {
      const appFilter = { environment: environmentId, name: applicationName };
      let update = { $set: { deployedVersion: activeVersion }}
      let arrayFilters = []
      if (dynamicName) {
        update = {
          $set: { 'dynamicNames.$[d].deployedVersion': activeVersion }
        }
        arrayFilters = [{ 'd.name': dynamicName }]
      }
      await ApplicationModel.findOneAndUpdate(appFilter, update, { arrayFilters }).exec();
    }
    return {
      success: true,
      outputs: jobId
    }
  } catch (error) {
    console.log(error.message)
    if (error.message === 'failed to schedule the job' && ['deploy', 'destroy'].indexOf(action) !== -1) {
      const state = {
        code: action === 'deploy' ? 'deploy_failed' : 'destroy_failed'
        // Note: we're not setting the jobId, anyway the job hasn't even been sent to the queue, maybe we can use this as an indication of internal server error, todo: update portal based on this
      }
      const result = await setState(accountId, environmentId, applicationName, state, dynamicName);
      if (!result.success) {
        return {
          error: {
            statusCode: constants.statusCodes.ise,
            message: 'Failed to set state.'
          }
        }
      }
    }
    console.error(`error: ${error.message}`);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: 'Failed to schedule the job!'
      }
    }
  }
}
//-----------------------------------------
// This method pulls the state file from s3 for the application and based on fields query extracts the root module outputs or entire state as the application resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getApplicationResources(environmentId, environmentName, applicationName, credentials, region, bucketName, domain, fields) {
  // Check if the application exists
  const application = await ApplicationModel.findOne({ environment: environmentId, name: applicationName }).exec();
  if (!application) {
    return {
      error: {
        statusCode: constants.statusCodes.badRequest,
        message: constants.errorMessages.models.elementNotFound
      }
    }
  }


  if(application.kind === constants.applicationKinds.eksBackgroundJob || application.kind === constants.applicationKinds.eksWebService) {
    const applicationVersion = await ApplicationVersion.findOne({ environmentApplication: application._id, version: application.deployedVersion, isActivated: true }).exec();
    if(!applicationVersion) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
    };

    const fields = '[eks_cluster_name]';
    const resource = await getKubernetesClusterResources(environmentName, applicationVersion.eks_cluster_name, credentials, region, bucketName, fields)
    const lambdaFunctionName = resource.outputs;

    AWS.config.apiVersions = {
      lambda: '2015-03-31'
    };

    AWS.config.update({
      region: region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    });

    const payload = {
      url: "/aws/app/info",
      method: "POST",
      body: {
        appName: applicationName,
        domain: domain.dns
      }
    };
    
    const lambda = new AWS.Lambda();
    const params = {
      FunctionName: `${lambdaFunctionName}_helm_manager_proxy`,
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: JSON.stringify(payload),
    };

    const lambdaResponse = await lambda.invoke(params).promise();

    const result = JSON.parse(lambdaResponse.Payload);

    return {
      success: true,
      outputs: result.message
    }
  }

  const baseConfig = {
    credentials,
    region
  }
  const s3 = getS3(baseConfig);
  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
      // TODO: [MVP-386] Update the inf-worker to use the environment name instead of undefined, then update the key here
      Key: `utopiops-water/applications/environment/${environmentName}/application/${applicationName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));

    // const fields = req.query.fields //Sending response based on fields query
    if (fields === "[*]") {
      return {
        success: true,
        outputs: state
      };
    }

    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      return {
				success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
			};
    }
    return {
      success: false
    }
  }
}
//-----------------------------------------
// This method pulls the state file from storage for the application and based on fields query extracts the root module outputs or entire state as the application resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getAzureApplicationResources(applicationName, credentials, environmentName, fields, providerBackend) {
  try {
    // const params = {
    //   Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
    //   Key: `utopiops-water/applications/environment/${environmentName}/application/${applicationName}`
    // };
    // const resp = await s3.getObject(params).promise();
    // const state = JSON.parse(resp.Body.toString());
    // console.log(JSON.stringify(state));

    const state = {}



    //Sending response based on fields query
    if (fields === "[*]") {
      return {
        success: true,
        outputs: state
      };
    }

    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      return {
				success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
			};
    }
    return {
      success: false
    }
  }
}
//---------------------------------------------------

function getS3(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.S3({
    apiVersion: awsApiVersions.s3
  });
}


function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey
  });
}

//------------------Model functions---------------------------------

async function activateApplication(userId, environmentId, applicationName, version) {
  let step = 0;
  let doc;
  try {
    // Check if such version for such application exists
    const filter = { environment: new ObjectId(environmentId), name: applicationName, activeVersion: { $ne: version } };
    doc = await ApplicationModel.findOne(filter)
    .populate('versions', 'version')
    .exec();
      if (doc == null || !doc.populated('versions')) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
        }
      console.log(doc.populated('versions'));
      const exists = doc.versions.findIndex(v => v.version === version) !== -1;
      console.log(doc.versions);
      if (!exists) {
        console.log(doc);
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
        }
        
        // Check to make sure it is not a corrupt version
        const appVersionFilter = {
            environmentApplication: doc._id,
            version
        };
        let appVer = await ApplicationVersionModel.findOne(appVersionFilter)
        if(appVer.isCorrupted) {
          return {
            error: {
              statusCode: constants.statusCodes.notAllowed,
              message: 'This specific version of the application is corrupted and cannot be activated'
            }
          }
        }
        // Now that it exists, update it
      const update = {
        activeVersion: version,
        activatedAt: timeService.now(),
        activatedBy: userId
      }
      const updated = await ApplicationModel.findByIdAndUpdate(doc._id, update, { new: true }).exec();
      if (updated == null) {
          return {
              success: false,
              error: {
                message: 'Failed to update',
                statusCode: constants.statusCodes.ise
              }
          };
      }
      step++;
      
      appVer = await ApplicationVersion.findOneAndUpdate(appVersionFilter, { $set: { isActivated: true } }, { new: true }).exec();
      if (appVer == null) { // This would mean data inconsistency!!
          return {
              success: false
          };
      }

      return {
          success: true
      };
  } catch (err) {
    console.log("error:", err);
      if (step > 0) {
          // rollback the activation data
          const update = {
              activeVersion: doc.activeVersion,
              activatedAt: doc.activatedAt,
              activatedBy: doc.activatedBy
          }
          const updated = await ApplicationModel.findByIdAndUpdate(doc._id, update, { new: true }).exec();
          if (updated == null) {
              return {
                  success: false,
                  error: {
                    message: 'Failed to update',
                    statusCode: constants.statusCodes.ise
                  }
              };
          }
      }
      let message = err.message;
      return {
          success: false,
          error: {
            message,
            statusCode: constants.statusCodes.ise
          }
      };
  }
}
//---------------------------------------
async function getForTf(environmentId, applicationName, providerBackend, version = null) {
  const runQuery = async () => {
    let appFilter = { environment: environmentId, name: applicationName };

      const doc = await ApplicationModel.findOne(appFilter, { activeVersion: 1, state: 1, kind: 1, name: 1, description: 1, isDynamicApplication: 1, dynamicNames: 1, buildHistory: 1 })
          .populate('environment', 'region hostedZone')
          .exec();

      if (doc == null) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
      }

      // If the version is not specified we use the version of the activated env-app
      const filter = { environmentApplication: doc._id, version: version ? version : doc.activeVersion ? doc.activeVersion : 1 };
      let app;
      switch (doc.kind) {
          case constants.applicationKinds.ecs:
              app = await EcsApplication.findOne(filter, { _id: 0, __v: 0 })
                  .populate({
                      path: 'cluster',
                      select: 'ecsClusterList.name ecsClusterList.instanceGroups.name -_id'
                  })
                  .populate({
                      path: 'alb',
                      select: 'albList.name albList.listenerRules.port -_id'
                  })
                  .populate({
                      path: 'rdsDetails',
                      select: 'name -_id',
                      match: { activeVersion: { $exists: true } }
                  })
                  .populate('createdBy', 'username -_id')
                  .exec();
              break;
          case constants.applicationKinds.s3Website: {
              app = await S3WebsiteApplication.findOne(filter, { _id: 0, __v: 0 })
                  .populate('createdBy', 'username -_id')
                  .exec();
              break;
          }
          case constants.applicationKinds.classicBaked: {
              app = await ClassicBakedApplication.findOne(filter, { _id: 0, __v: 0 })
                  .populate({
                      path: 'alb',
                      select: 'albList.name albList.listenerRules.port -_id'
                  })
                  .populate({
                      path: 'nlb',
                      select: 'nlbList.name -_id'
                  })
                  .populate('createdBy', 'username -_id')
                  .exec();
              break;
          }
          case constants.applicationKinds.azureStaticWebsite: {
              app = await AzureStaticWebsiteApplication.findOne(filter)
              .exec();
              break;
            }
          case constants.applicationKinds.eksWebService: {
              app = await EksWebServiceApplication.findOne(filter, { _id: 0, __v: 0 })
              .populate('createdBy', 'username -_id')
              .exec();
              break;
          }
          case constants.applicationKinds.eksBackgroundJob: {
              app = await EksBackgroundJobApplication.findOne(filter, { _id: 0, __v: 0 })
                  .populate('createdBy', 'username -_id')
                  .exec();
              break;
          }
      }
      if (app == null) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
      }
      let result = app.toJSON();
      result.region = doc.environment.region;
      result.hostedZone = doc.environment.hostedZone;
      result.domain = doc.environment.domain;
      result.description = doc.description;
      result.isDynamicApplication = doc.isDynamicApplication;
      result.dynamicNames = doc.dynamicNames;
      result.app_name = doc.name;
      result.activeVersion = doc.activeVersion;
      result.state = doc.state;
      result.buildHistory = doc.buildHistory;
      if (doc.kind == constants.applicationKinds.ecs) {
        result.ecrRegisteryUrl = `${providerBackend.cloudProviderAccountId}.dkr.ecr.${providerBackend.region}.amazonaws.com`
      }
      return result;
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function getApplicationKind(environmentId, applicationName) {
  try {
      const appFilter = { environment: environmentId, name: applicationName };
      const doc = await ApplicationModel.findOne(appFilter, { kind: 1, _id: 1, activeVersion: 1 }).exec();
      if (doc == null) {
          return {
            error: {
              statusCode: constants.statusCodes.badRequest,
              message: constants.errorMessages.models.elementNotFound
            }
          };
      }
      return {
          success: true,
          output: {
              kind: doc.kind,
              id: doc._id,
              activeVersion: doc.activeVersion
          }
      }
  } catch (err) {
      console.log(`Error in getApplicationKind: ${err}`);
      return {
        error: {
          statusCode: constants.statusCodes.ise,
          message: 'Something went wrong'
        }
      };
  }
}
//-------------------------------------
async function getApplicationAndVersion(environmentId, applicationName, dynamicName, action, version = null) {
  // get application and applicationVersion from here fo deployment
  try {
    const appFilter = { environment: environmentId, name: applicationName };
    const application = await ApplicationModel.findOne(appFilter, { kind: 1, _id: 1, activeVersion: 1, deployedVersion: 1, isDynamicApplication: 1, dynamicNames: 1, releaseName: 1 }).exec();
    if (application == null) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      };
    }
    const index = dynamicName ? application.dynamicNames.findIndex(d => d.name == dynamicName) : null

    const filter = { 
      environmentApplication: application._id,
      version: (action === 'destroy' && dynamicName) ? application.dynamicNames[index].deployedVersion
        : (action === 'destroy') ? application.deployedVersion
        : (action === 'deploy'|| !version) ? application.activeVersion
        : version
    };
    const applicationVersion = await ApplicationVersion.findOne(filter).exec()
    if (applicationVersion == null) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      };
    }
    return {
      success: true,
      outputs: {
        application,
        applicationVersion
      }
    }
  } catch (error) {
    console.log(`Error in getApplicationAndVersion: ${error}`);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: 'Something went wrong'
      }
    };
  }
}
//----------------------------
async function getApplicaitonSummary(environmentId, applicationName) {
  const runQuery = async () => {
    const filter = { environment: environmentId, name: applicationName };
    return await ApplicationModel.findOne(filter, { _id: 0, kind: 1, state: 1, jenkinsState: 1, deployedVersion: 1, activeVersion: 1, isDynamicApplication: 1 }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------------------
async function setState(accountId, environmentId, applicationName, state, dynamicName = null) {
  const runQuery = async () => {
    const stateCode = state.code;
    const jobId = state.job;
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
      await ApplicationDeploymentModel.findOneAndUpdate({
        accountId ,
        applicationName ,
        jobId
      } , { state: stateCode }).exec();
    }

    if (dynamicName) {
      // here we update dynamicName's state code
      const filter = { 
        environment: environmentId,
        name: applicationName,
        isDynamicApplication: true,
        'dynamicNames.name': dynamicName
      };
      const app = await ApplicationModel.findOne(filter).exec()
      if (app) {
        const index = app.dynamicNames.findIndex((d) => d.name == dynamicName)
        if (!validCurrentState.includes(app.dynamicNames[index].state.code)) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
        }
      } else {
        return {
          success: false,
          error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
        };
      }

      const update = {
        $set: { 'dynamicNames.$[d].state': state }
      }
      const arrayFilters = [{ 'd.name': dynamicName }]

      return await ApplicationModel.findOneAndUpdate(filter, update, { arrayFilters }).exec();
    }

    const filter = { // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
        environment: environmentId,
        name: applicationName,
        'state.code': { $in: validCurrentState }
    };
    return await ApplicationModel.findOneAndUpdate(filter, { $set: { state } }, { new: true }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
// --------------------------------------
async function setJobId(environmentId, applicationName, jobId, dynamicName) {
  const filter = { 
    environment: environmentId,
    name: applicationName,
  };
  let update = {
    $set: {"state.job": jobId }
  }
  let arrayFilters = []
  if (dynamicName) {
    filter.isDynamicApplication = true
    filter['dynamicNames.name'] = dynamicName
    update = {
      $set: { 'dynamicNames.$[d].state.job': jobId }
    }
    arrayFilters = [{ 'd.name': dynamicName }]
  }
  return await ApplicationModel.findOneAndUpdate(filter, update, { new: true, arrayFilters }).exec();
}
//-----------------------------
async function listApplicationVersions(environmentId, applicationName) {
  const runQuery = async () => {
    const filter = { environment: environmentId, name: applicationName };
    const applications = await ApplicationModel.findOne(filter, { _id: 1 }).populate('versions', 'version fromVersion createdAt').exec();
    if (applications == null) {
        return {
          success: false,
          error: {
            message: constants.errorMessages.models.elementNotFound,
            statusCode: constants.statusCodes.badRequest
          }
        };
    }
    let appList = applications.versions.map(app => ({
        version: app.version,
        fromVersion: app.fromVersion,
        kind: app.kind,
        createdAt: app.createdAt,
    }));
    return appList;
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function deleteApplication(accountId, userId, environmentId, environmentName, applicationName, headers) {
  const runQuery = async () => {
    let doc;
    // Check if such version for such application exists
    const filter = { environment: new ObjectId(environmentId), name: applicationName };
    doc = await ApplicationModel.findOne(filter).exec();
    console.log(`doc`, doc);
    if (doc == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    // TODO: This is just the basic condition for now, has to be refined later as we use the application and figure out the common usage patterns

    // Check if the application is in a state that can be deleted
    // If application is eks webservice, we only need to check the jenkins state to delete it
    let canDelete = false;
    const state = doc.kind === constants.applicationKinds.eksWebService ? doc.jenkinsState.code : doc.state.code;
    
    if (["destroyed", "created"].indexOf(state) !== -1 || !doc.activeVersion) {
        canDelete = true;
    }
    if (!canDelete) {
      return {
        success: false,
        error: {
          message: "Cannot delete the application, it needs to be destroyed first",
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    
    // We delete the pipieline of eks webservice when we destroy it so we don't need to delete the pipeline
    await deletePipeline(environmentId, applicationName, headers)
    const appVersionFilter = { environmentApplication: doc._id };
    await ApplicationVersion.deleteMany(appVersionFilter).exec();
    await ApplicationDeploymentModel.updateMany({ accountId, environmentName, applicationName }, { isDeleted: true })
    await ApplicationModel.findByIdAndDelete(doc._id).exec();
    return {
      success: true
    };
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------
async function deleteDynamicApplication(environmentId, applicationName, dynamicName) {
  const runQuery = async () => {
    const filter = { 
      environment: environmentId,
      name: applicationName,
      isDynamicApplication: true,
      'dynamicNames.name' : dynamicName
    };
    const app = await ApplicationModel.findOne(filter, { dynamicNames: 1 }).exec();
    if (app == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    const index = app.dynamicNames.findIndex((d) => d.name == dynamicName)

    if (app.dynamicNames[index].state.code !== "destroyed") {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    if (app.dynamicNames[index].jobName) {
      await deletePipeline(environmentId, applicationName, headers, dynamicName)
    }
    const update = {
      $pull: {
        dynamicNames : { name: dynamicName }
      }
    }
    await ApplicationModel.findOneAndUpdate(filter, update).exec()
    return {
      success: true
    }
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}

async function listDynamicApplications(environmentId, applicationName) {
  const runQuery = async () => {
    const filter = { 
      environment: environmentId,
      name: applicationName,
      isDynamicApplication: true
    };
    return await ApplicationModel.findOne(filter, { dynamicNames: 1 }).exec();
	};

	const extractOutput = (result) => result.dynamicNames;

	return await runQueryHelper(runQuery, extractOutput);
}

async function dynamicAction(accountId, environmentId, environmentName, applicationName, dynamicName, action) {
  try {
    const filter = { 
      environment: environmentId,
      name: applicationName,
      isDynamicApplication: true
    };
    const doc = await ApplicationModel.findOne(filter, { dynamicNames: 1, repositoryUrl: 1 }).exec();
    if (doc == null) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      };
    }
    const dynamicNameIndex = doc.dynamicNames.findIndex((d) => d.name == dynamicName)
    if (action == 'destroy' && dynamicNameIndex == -1) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      };
    }
    if (action == 'deploy' && dynamicNameIndex == -1) {
      const update = {
        $push: { 
          dynamicNames: { 
            name: dynamicName,
            jobName: doc.repositoryUrl ? `${applicationName}-${dynamicName}-${environmentName}-${accountId}` : '',
            state: { code: "created" } 
          } 
        }
      }
      await ApplicationModel.findOneAndUpdate(filter, update).exec();
    }
    return {
      success: true
    }
  } catch (error) {
    console.log('Error in dynamic action: ', error)
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}
//--------------------------------------------------------------------------
async function createPipeline(environmentId, environmentName, applicationName, version, headers, region, cloudProviderAccountId, gitService) {
  try {
    const filter = {
      environment: environmentId,
      name: applicationName
    }
    const app = await ApplicationModel.findOne(filter, { _id: 1, kind: 1})
      .populate('environment', 'hostedZone domain')
      .exec();
    console.log(app)
    if (!app) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
    }

    const appVersionFilter = {
      environmentApplication: app._id,
      version
    };
    const appVersion = await ApplicationVersion.findOne(appVersionFilter).exec();
    if (!appVersion) {
      return {
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
      }
    }

    let templates
    switch (app.kind) {
      case constants.applicationKinds.ecs :
        const ecrRepositoryUrl = `${cloudProviderAccountId}.dkr.ecr.${region}.amazonaws.com`

        const containerName = appVersion.containers.find(c => !c.image).name
        const repositotyName = `${environmentName}-${applicationName}-${containerName}`

        templates = [{
          title: "build",
          templates: [
            {
              id: `${gitService}:water_docker_build_ecs_app`,
              fields: [
                {
                  key: "ecr_registry_url",
                  value: ecrRepositoryUrl
                },
                {
                  key: "repository_name",
                  value: repositotyName
                }
              ],
              job_name: "build"
            }
          ]
        },
        {
          title: "deploy",
          templates: [
            {
              id: `${gitService}:water_deploy_ecs_app`,
              fields: [
                {
                  key: "environment",
                  value: environmentName
                },
                {
                  key: "application_name",
                  value: applicationName
                }
              ],
              job_name: "deploy"
            }
          ]
        }]
        break
      case constants.applicationKinds.s3Website :

        const hostedZone = app.environment.hostedZone
        const domain = app.environment.domain
        const bucket = `${applicationName}.${domain.dns}`
        const releaseBucket = `${bucket}-releases`
        const appUrl = `https://${bucket}`

        templates = [{
          title: "build",
          templates: [
            {
              id: `${gitService}:water_build_static_website`,
              title: 'build Water static website',
              fields: [
                {
                  key: "environment",
                  value: environmentName
                }
              ],
              job_name: "build"
            }
          ]
        },
        {
          title: "deploy",
          templates: [
            {
              id: `${gitService}:water_deploy_static_website`,
              title: 'deploy Water static website',
              fields: [
                {
                  key: "environment",
                  value: environmentName
                },
                {
                  key: "application_name",
                  value: applicationName
                },
                {
                  key: 'release_bucket',
                  value: releaseBucket
                },
                {
                  key: 'app_url',
                  value: appUrl
                }
              ],
              job_name: "deploy"
            }
          ]
        }]
        break
    }

    const httpConfig = new HttpConfig().withCustomHeaders(headers);
    const url = `${config.pipelineHelperUrl}/template`;

    const res = await http.post(url, templates, httpConfig.config);
    console.log(res.data)
    return {
      success: true,
      outputs: res.data
    }
  } catch (error) {
    console.log(error)
    return {
      error: {
        statusCode: error.statusCode || constants.statusCodes.ise,
        message: error.message
      }
    }
  }
}
//-----------------------------
async function setApplicationJenkinsState(accountId, environmentId, environmentName, applicationName, jenkinsState, kind) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      name: applicationName
    }

    let update;
    if(kind === constants.applicationKinds.eksWebService || kind === constants.applicationKinds.eksBackgroundJob) {
      update = {
        $set: { jenkinsState, state: jenkinsState }
      };
    }
    else {
      update = {
        $set: { jenkinsState }
      };
    }

    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      accountId,
      category: "jenkins",
      dataBag: {
          jobPath: `${kind}/${jenkinsState.code}`,
          environmentName,
          applicationName,
          status: jenkinsState.code
      }
    }

    const url = `${config.nightingaleUrl}/notification`
    const res = await http.post(url, body, httpConfig.config);
    if(res.status !== 200) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.ise
        }
      }
    }
      
    return await ApplicationModel.findOneAndUpdate(filter, update, { new: true }).exec();
  };
      
  return await runQueryHelper(runQuery);
}
//---------------------------------------------------------------------------------------
async function setDynamicApplicationJenkinsState(accountId, environmentId, environmentName, applicationName, dynamicName, jenkinsState, kind) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      name: applicationName,
      isDynamicApplication: true,
      dynamicNames: {
        $elemMatch: {
          name: dynamicName,
          jobName: { $ne: ''}
        }
      }
    }
    const update = {
      $set: { 'dynamicNames.$[d].jenkinsState': jenkinsState }
    }
    const arrayFilters = [{ 'd.name': dynamicName }]

    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      accountId,
      category: "jenkins",
      dataBag: {
          jobPath: `${kind}/${jenkinsState.code}`,
          environmentName,
          applicationName,
          dynamicName,
          status: jenkinsState.code
      }
    }

    const url = `${config.nightingaleUrl}/notification`
    const res = await http.post(url, body, httpConfig.config);
    if(res.status !== 200) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.ise
        }
      }
    }
      
    return await ApplicationModel.findOneAndUpdate(filter, update, { arrayFilters }).exec();
  };
      
  return await runQueryHelper(runQuery);
}
//---------------------------------------------------------------------------------------
async function deletePipeline(environmentId, applicationName, headers, dynamicName = null) {
  try {
    if (process.env.IS_LOCAL) {
      // Pipeline actions is not supported in local environment
      return {
        success: true,
      };
    }
    // Check if the application exists (get it's _id)
    const filter = {
      environment: environmentId,
      name: applicationName
    };
    if (dynamicName) {
      filter['dynamicNames.name'] = dynamicName
    }
    const app = await ApplicationModel.findOne(filter, { _id: 1, activeVersion: 1, jobName: 1, dynamicNames: 1 }).exec();
    if (app == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    let jobName = app.jobName;
    if (dynamicName) {
      jobName = app.dynamicNames.find(d => d.name === dynamicName).jobName;
    }

    if (!jobName) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    const params ={
      jobName,
    }

    await http.post(`${config.ciHelperUrl}/job/delete`, params, {
      headers,
    });

    return {
      success: true,
    }
  } catch (err) {
    logger.error(`Error deleting Jenkins job: ${err.message}`);
    return {
      error: {
        message: 'Error deleting Jenkins job',
      },
    };
  }
}
//-------------------------------------------------------------
async function saveBuildTime(accountId, environmentId, appName, buildTime) {
  try {
    const filter = {
      environment: ObjectId(environmentId),
      name: appName
    };
    const app = await ApplicationModel.findOne(filter, { jobName: 1, kind: 1 }).exec();
    if (!app) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      }
    }

    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      account_id: accountId,
      seconds: Math.round(buildTime / 1000),
      app_name: appName,
      app_type: app.kind
    }
    const url = `${config.planManagerUrl}/user/usage/buildtime `
    console.log(body, token, url)
    await http.post(url, body, httpConfig.config);

    return {
      success: true
    }
  } catch (error) {
    logger.error(`Error in saving build time: ${error.message}`);
    return {
      error: {
        stateCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}