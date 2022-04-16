const constants = require('../../../utils/constants');
const { defaultLogger: logger } = require('../../../logger');
const { runQueryHelper } = require('../helpers');
const queueService = require('../../../queue');
const UtopiopsApplicationModel = require('./utopiopsApplication');
const CustomDomainStaticService = require('./customDomainStaticWebsite.service');
const DomainModel = require('../domain/domain');
const ObjectId = require('mongoose').Types.ObjectId;
const config = require('../../../utils/config').config;
const EnvironmentService = require('../environment/environment.service');
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const HttpConfig = require('../../../utils/http/http-config');
const { getInternalToken } = require('../../../services/auth');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');

exports.listApplications = listApplications;
exports.listApplicationsByRepoUrl = listApplicationsByRepoUrl;
exports.deleteApplication = deleteApplication;
exports.getApplicationDetails = getApplicationDetails;
exports.getApplicationResources = getApplicationResources;
exports.getApplicationDetailsInternal = getApplicationDetailsInternal;
exports.destroyApplication = destroyApplication;
exports.setState = setState;
exports.setJobId = setJobId;
exports.setApplicationJenkinsState = setApplicationJenkinsState;
exports.deletePipeline = deletePipeline;
exports.deleteDockerApplication = deleteDockerApplication;
exports.saveBuildTime = saveBuildTime;
exports.startApplicationPlan = startApplicationPlan;
exports.stopApplicationPlan = stopApplicationPlan;

//-----------------------------------------------------------------------
async function listApplications(accountId) {
  const runQuery = async () => {
    const filter = { accountId };
		return await UtopiopsApplicationModel.find(filter, { name: 1, kind: 1, jenkinsState: 1 }).exec();
	};

	const extractOutput = (result) => {
    return [...result.map(app => ({
			id: app._id,
			name: app.name,
			kind: app.kind,
      jenkinsState: app.jenkinsState
		}))];
  };

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------------------------------
async function listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl) {
  const runQuery = async () => {
    const filter = { $or: [ { repositoryUrl: htmlUrl }, { repositoryUrl: cloneUrl }, { repositoryUrl: sshUrl } ] };
    const doc = await UtopiopsApplicationModel.find(filter, { name: 1, jobName: 1, repositoryUrl: 1, branch: 1, accountId: 1 }).exec();
    return doc;
	};

	const extractOutput = (result) => {
    return [...result.map(app => ({
			name: app.name,
			jobName: app.jobName,
      repositoryUrl: app.repositoryUrl,
      branch: app.branch,
      accountId: app.accountId
		}))];
  };

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------------------------------
async function getApplicationDetails(accountId, applicationName) {
  const runQuery = async () => {
    const filter = {
      accountId,
      name: applicationName
    }
    return await UtopiopsApplicationModel.findOne(filter, { _id: 0 });
	};

  const extractOutput = (result) => result;
  
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------------------------------
async function getApplicationDetailsInternal(applicationName) {
  const runQuery = async () => {
    const filter = {
      name: applicationName
    }
    return await UtopiopsApplicationModel.findOne(filter, { _id: 0 });
	};

  const extractOutput = (result) => result;
  
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------------------------------
async function deleteApplication(accountId, applicationName) {
  const runQuery = async () => {
    const filter = {
      accountId,
      name: applicationName
    }
    const app = await UtopiopsApplicationModel.findOne(filter)
    .populate('domainId', 'domainName')
    .exec();
    if (app && (app.kind == constants.applicationKinds.customDomainStatic)) {
      if (!['destroyed', 'created'].includes(app.state.code)) {
        return {
          error: {
            message: 'The application must be destroyed first',  
            statusCode: constants.statusCodes.badRequest
          }
        }
      }
    }

    if (app.domainId && app.domainId.domainName) {
      filter.domainId = app.domainId._id;
    }

    if (app.kind == constants.applicationKinds.staticWebsite) {
      if (!app.jobName) {
        console.log(app.domain)
        app.jobName = app.domain.substring(app.domain.indexOf('https://')+8, app.domain.indexOf(`${config.staticWebsiteSubdomain}.utopiops.com`))
        console.log(app.jobName)
      }
      const result = await deleteStaticWebsiteResources(app.jobName)
      if (!result.success) return result
    }
    else if(app.kind == constants.applicationKinds.docker) {
      const result = await deleteDockerApplication(app)
      if (!result.success) return result
    }

    await stopApplicationPlan(accountId, applicationName, filter.domainId ? app.domainId.domainName : '')
    
    return await UtopiopsApplicationModel.findOneAndDelete(filter);
	};

	return await runQueryHelper(runQuery);
}
//-----------------------------------------------------------------------
async function deleteStaticWebsiteResources(jobName) {
  try {
    AWS.config.update({
      region: config.utopiopsProviderRegion,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const route53 = new AWS.Route53({ apiVersion: awsApiVersions.route53 });
    const route53Params = {
      ChangeBatch: {
        Comment: "Deleting Alias resource record sets in Route 53",
        Changes: [{
          Action: "DELETE", 
          ResourceRecordSet: {
            Name: `${jobName + config.staticWebsiteSubdomain}.utopiops.com`, 
            AliasTarget: {
              HostedZoneId: "Z2FDTNDATAQYW2",
              DNSName: `${config.staticWebsiteCloudfrontDnsName}`,
              EvaluateTargetHealth: false
            },
            Type: "A"
          }
        }]
      }, 
      HostedZoneId: config.staticWebsiteHostedZoneId
    };
    const res1 = await route53.changeResourceRecordSets(route53Params).promise()
    logger.verbose(res1)

  } catch (error) {
    logger.error(`Error in deleting record set: ${error}`)
  }

  try {
    const s3 = new AWS.S3({ apiVersion: awsApiVersions.s3 });
    const s3Params = {
      Bucket: config.staticWebsiteBucket, 
      Prefix: jobName + config.staticWebsiteSubdomain
    };
    const listedObjects = await s3.listObjectsV2(s3Params).promise(); // TODO: delete bucket with aws cli
    if (listedObjects.Contents.length === 0) {
      logger.verbose('S3 bucket is empty.')
      return {
        success: true
      }
    }

    const deleteParams = {
      Bucket: config.staticWebsiteBucket,
      Delete: { Objects: [] }
    };
    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });
    const res = await s3.deleteObjects(deleteParams).promise();
    logger.verbose('S3 bucket cleared.')

    return {
      success: true
    }
  } catch (error) {
    logger.error(`Error in clearing s3 bucket: ${error}`)
    return {
      success: true
    }
  }
}
//-----------------------------------------------------------------------
async function destroyApplication(accountId, applicationName) { // This is only for custom domain static websites.
  try {
    const filter = {
      accountId: ObjectId(accountId),
      name: applicationName,
      kind: { $in: [constants.applicationKinds.customDomainStatic]}
    };
    const app = await UtopiopsApplicationModel.findOne(filter).exec();

    if (!app) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,  
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    // Check if domain exists
		const domainFilter = {
			_id: app.domainId,
      createCertificate: true,
			accountId: app.accountId
		}

		const domain = await DomainModel.findOne(domainFilter);
		if(!domain) {
			return {
				success: false,
				error: {
					message: 'Provided domain does not exist.',
					statusCode: constants.statusCodes.badRequest
				}
			}
		}
  
    const result = await setState(app.accountId, app.name, { code: 'destroying' })
    if (!result.success) {
      return result
    }

    try { // Sending appllication bandwidth usage to plan manager
      const endTime = new Date();
      const startTime = new Date(endTime.getFullYear(), endTime.getMonth(), 1) // Start of this month
  
      const bandwidth = await CustomDomainStaticService.getBandwidth(app.accountId, domain.domainName, applicationName, startTime, endTime)

      const token = await getInternalToken();
      const httpConfig = new HttpConfig().withBearerAuthToken(token);
  
      const body = {
        account_id: accountId,
        application: applicationName,
        domain: domain.domainName,
        bandwidth: bandwidth.outputs.usage
      }
      const url = `${config.planManagerUrl}/user/usage/bandwidth`;
      console.log(body, token, url)
      await http.post(url, body, httpConfig.config);
  
    } catch (error) {
      logger.error(`Error in stopping application plan: ${error}`);
    }

    let jobPath;
    switch (app.kind) {
      case constants.applicationKinds.customDomainStatic:
      jobPath = constants.jobPaths.destroyUtopiopsStaticWebsite;
      break;
    }
  
    const message = {
      jobPath,
      jobDetails: {
        userId: app.createdBy,
        accountId: app.accountId,
        details: {
          domainName: domain.domainName,
          ...app.toObject(),
        }
      }
    };

    logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
  
    const options = {
      userId: message.jobDetails.userId,
      accountId: message.jobDetails.accountId,
      path: message.jobPath,
      jobDataBag: {}
    };

    const appQueName = config.queueName;
    const jobId = await queueService.sendMessage(appQueName, message, options);
  
      // const jobNotification = {
      //   accountId: message.jobDetails.accountId,
      //   category: "infw",
      //   dataBag: {
      //     jobPath: message.jobPath,
      //     environmentName,
      //     status: 'created',
      //     jobId
      //   }
      // }
      // await job.sendJobNotification(jobNotification, headers)
  
    await setJobId(app.accountId, app.name, jobId);
    
    return {
      success: true,
      outputs: jobId
    }
  } catch (error) {
    console.log(`error: ${error.message}`);
    return {
      success: false,
      message: 'Failed to schedule the job!'
    };
  }
}
//-----------------------------------------------------------------------
async function setState(accountId, applicationName, state, dynamicName = null) {
  const runQuery = async () => {
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
        accountId,
        name: applicationName,
        kind: constants.applicationKinds.customDomainStatic, // At this moment setState only will be used on custom domain static website 
        'state.code': { $in: validCurrentState }
    };
    return await UtopiopsApplicationModel.findOneAndUpdate(filter, { $set: { state } }, { new: true }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
// --------------------------------------
async function setJobId(accountId, applicationName, jobId, dynamicName = null) {
  const filter = { 
    accountId,
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
  return await UtopiopsApplicationModel.findOneAndUpdate(filter, update, { new: true, arrayFilters }).exec();
}


//-----------------------------
async function setApplicationJenkinsState(accountId, applicationName, jenkinsState, kind) {
  const runQuery = async () => {
    const filter = {
      accountId,
      name: applicationName
    };
    const update = {
      $set: { jenkinsState }
    }

    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      accountId,
      category: "jenkins",
      dataBag: {
          jobPath: `${kind}/${jenkinsState.code}`,
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
      
    return await UtopiopsApplicationModel.findOneAndUpdate(filter, update, { new: true }).exec();
  };
      
  return await runQueryHelper(runQuery);
}
// ---------------------------------------------
async function deletePipeline(accountId, applicationName, headers) {
  try {
    if (process.env.IS_LOCAL) {
      // Pipeline actions is not supported in local environment
      return {
        success: true,
      };
    }

    const filter = { 
      accountId,
      name: applicationName,
    };
    const app = await UtopiopsApplicationModel.findOne(filter).exec();

    if (!app) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const params ={
      jobName: app.jobName
    }

    await http.post(`${config.ciHelperUrl}/job/delete`, params, {
      headers,
    });

    return {
      success: true,
    }
  } catch (err) {
    // if the pipeline didn't exist, we simply skip deleting it
    if (err.response && err.response.status === 404) {
      return {
        success: true,
      }
    }
    logger.error(`Error deleting job: ${err.message}`);
    return {
      success: false,
      error: {
        message: 'Error deleting job',
      },
    };
  }
}
//-------------------------------------------------------------
async function saveBuildTime(accountId, appName, buildTime) {
  try {
    const filter = {
      accountId: ObjectId(accountId),
      name: appName
    };
    const app = await UtopiopsApplicationModel.findOne(filter, { jobName: 1, kind: 1 }).exec();
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
      seconds: Math.floor(buildTime / 1000),
      app_name: appName,
      app_type: app.kind
    }
    const url = `${config.planManagerUrl}/user/usage/buildtime`
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
//-------------------------------------------------------------
async function deleteDockerApplication(app) {
  try {
    const body = {
      appName: app.name,
      domain: app.domainId ? app.domainId.domainName : `${config.dockerSubdomain.slice(1)}.utopiops.com`
    }
    const url = `${config.helmManagerUrl}/aws/app/delete`;
    await http.post(url, body);

    return {
      success: true
    }
  } catch (error) {
    logger.error(`Error in deleting docker application: ${error.message}`);
    return {
      error: {
        stateCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}
//-------------------------------------------------------------
async function startApplicationPlan(accountId, applicationName, domainName, appKind, appSize = 'none') {
  try {
    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      account_id: accountId,
      name: applicationName,
      domain: domainName ? domainName : '',
      kind: appKind,
      size: appSize
    }
    const url = `${config.planManagerUrl}/user/usage/application/create`
    console.log('Sending create application request to plan manager...')
    await http.post(url, body, httpConfig.config);

    return {
      success: true
    }
  } catch (error) {
    logger.error(`Error in starting application plan: ${error.message}`);
    return {
      error: {
        stateCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}
//-------------------------------------------------------------
async function stopApplicationPlan(accountId, applicationName, domainName) {
  try {
    const token = await getInternalToken();
    const httpConfig = new HttpConfig().withBearerAuthToken(token);

    const body = {
      account_id: accountId,
      name: applicationName,
      domain: domainName,
    }
    const url = `${config.planManagerUrl}/user/usage/application/delete`;
    console.log(body, token, url)
    await http.post(url, body, httpConfig.config);

    return {
      success: true
    }
  } catch (error) {
    logger.error(`Error in stopping application plan: ${error.message}`);
    return {
      error: {
        stateCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}
//-------------------------------------------------------------
async function getApplicationResources(accountId, applicationName) {
  try {
    // Get application
    const app = await UtopiopsApplicationModel.findOne({
      accountId,
      name: applicationName
    }).populate('domainId').exec();

    if (!app) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      }
    }

    if(app.kind === constants.applicationKinds.docker) {
      const body = {
        appName: app.name,
        domain: app.domainId ? app.domainId.domainName : `${config.dockerSubdomain.slice(1)}.utopiops.com`
      }

      console.log(body);
      
      const url = `${config.helmManagerUrl}/aws/app/info`

      const response = await http.post(url, body);

      return {
        success: true,
        outputs: response.data
      }
    }
  } catch (error) {
    logger.error(`Error in getting application resource: ${error.message}`);
    return {
      error: {
        stateCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}