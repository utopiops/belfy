const constants = require('../../../utils/constants');
const { defaultLogger: logger } = require('../../../logger');
const { runQueryHelper } = require('../helpers');
const queueService = require('../../../queue');
const customDomaintaticWebsiteModel = require('./customDomainStaticWebsite');
const UtopiopsApplicationModel = require('./utopiopsApplication');
const UtopiopsApplicationService = require('./utopiopsApplication.service');
const DomainModel = require('../domain/domain');
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const config = require('../../../utils/config').config;
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');


exports.createCustomDomainStaticWebsite = createCustomDomainStaticWebsite;
exports.updateCustomDomainStaticWebsite = updateCustomDomainStaticWebsite;
exports.createPipeline = createPipeline;
exports.getApplicationBandwidth = getApplicationBandwidth;
exports.listApplicationsBandwidth = listApplicationsBandwidth;
exports.getApplicationResources = getApplicationResources;
exports.getBandwidth = getBandwidth;

//-----------------------------------------------------------------------
async function createCustomDomainStaticWebsite(app) {
  try {
		// Check if application already exists
		const filter = {
			name: app.name,
			accountId: app.accountId
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

    // Check if domain exists
		const domainFilter = {
			domainName: app.domainName,
      createCertificate: true,
			accountId: app.accountId,
      'state.code': 'deployed'
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

    app.domain = `https://${app.name}.${domain.domainName}`
    app.domainId = domain._id
    app.jobName =  `${app.name}.${domain.domainName}`;


		const result = await customDomaintaticWebsiteModel.create(app);
    if (!result || result.error) {
      return result;
    }

    await UtopiopsApplicationService.startApplicationPlan(app.accountId, app.name, domain.domainName, constants.applicationKinds.customDomainStatic);

    await UtopiopsApplicationService.setState(app.accountId, app.name, { code: 'deploying' })

    const message = {
      jobPath: constants.jobPaths.deployUtopiopsStaticWebsite,
      jobDetails: {
        userId: app.createdBy,
        accountId: app.accountId,
        details: {
          domainName: domain.domainName,
          ...app,
        }
      }
    };

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
    //     applicationName,
    //     status: 'created',
    //     jobId
    //   }
    // }
    // await job.sendJobNotification(jobNotification, res.locals.headers)
    // Set the jobId in the state now that the message is sent
    await UtopiopsApplicationService.setJobId(app.accountId, app.name, jobId);
    
    return {
      success: true,
      outputs: jobId
    }
  } catch (error) {
    console.log(error)
    if (error.message === 'failed to schedule the job') {
      await customDomaintaticWebsiteModel.findOneAndDelete({
        name: app.name,
        accountId: app.accountId
      }).exec()
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
//-----------------------------------------------------------------------
async function updateCustomDomainStaticWebsite(app, headers) {
	try {
		const filter = {
			name: app.name,
			accountId: app.accountId,
			kind: constants.applicationKinds.customDomainStatic
		}

		const updatedApp = await UtopiopsApplicationModel.findOneAndUpdate(filter, app, { new: 1 }).exec();
		if (!updatedApp) {
			return {
				error: {
					statusCode: constants.statusCodes.badRequest,
					message: constants.errorMessages.models.elementNotFound
				}
			}
		}


    const res = await UtopiopsApplicationService.deletePipeline(
      updatedApp.accountId,
      updatedApp.name,
      headers,
    );
    if (res.error) return res;

    const result = await createPipeline(updatedApp.accountId, updatedApp.name, headers);
    if (result.error) return result;

		return {
			success: true
		}

	} catch (error) {
		logger.error(error.message)
		return {
			error: {
				statusCode: constants.statusCodes.ise,
				message: error.message
			}
		}
	}
}
//-----------------------------
async function createPipeline(accountId, applicationName, headers) {
  try {

    if (process.env.IS_LOCAL) {
      // Pipeline creation is not supported in local environment
      return {
        success: true,
      };
    }

    const filter = {
      name: applicationName,
      accountId,
    };
    
    const app = await UtopiopsApplicationModel.findOne(filter).populate('domainId', 'domainName').exec();
    if (!app) {
      return {
        error: {
          message: 'application not found',
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    const params ={
      ...app._doc,
      domainName: app.domainId.domainName,
      isParameterized: false,
    }

    await http.post(`${config.ciHelperUrl}/job/create`, params, {
      headers,
    });

    return {
      success: true,
    };
  } catch (error) {
		logger.error(`Error in pipeline creation:: ${error}`)
		return {
			error: {
				statusCode: constants.statusCodes.ise,
				message: error.message
			}
		}
  }
}
//-----------------------------------------------------------------------
async function getApplicationBandwidth(accountId, domainName, applicationName, startTime, endTime) {
  try {
    const domainFilter = {
      domainName,
      accountId,
    };
    const domain = await DomainModel.findOne(domainFilter, { _id: 1 }).exec();
    if (!domain) {
      return {
        error: {
          message: 'domain not found',
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    const filter = {
      accountId,
      domainId: domain._id,
      name: applicationName,
      kind: constants.applicationKinds.customDomainStatic,
    };
    
    const app = await UtopiopsApplicationModel.findOne(filter).exec();
    if (!app) {
      return {
        error: {
          message: 'application not found',
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    return await getBandwidth(accountId, domainName, applicationName, startTime, endTime)
  
  } catch (error) {
    logger.error(`Error in getting bandwidth usage:: ${error}`)
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
    }
  }
}
//-----------------------------------------------------------------------
async function listApplicationsBandwidth(accountId, startTime, endTime){
  try {
    const filter = {
      accountId,
      kind: constants.applicationKinds.customDomainStatic,
    };
    const apps = await UtopiopsApplicationModel.find(filter).populate('domainId', 'domainName').exec();
    if (!apps) {
      return {
        error: {
          message: 'application not found',
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    const promises = apps.map(async app => {
      const result = await getBandwidth(accountId, app.domainId.domainName, app.name, startTime, endTime)
      return result.outputs
    })
    const result = await Promise.all(promises)
    return {
      success: true,
      outputs: result
    }
  } catch (error) {
    logger.error(`Error in listing applications bandwidth usage: ${error}`)
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
    }
  }
}
//-----------------------------------------------------------------------
async function getBandwidth(accountId, domainName, applicationName, startTime, endTime) {
  try {
    AWS.config.update({
      region: process.env.UTOPIOPS_PROVIDER_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    const cloudwatch = new AWS.CloudWatch({
        apiVersion: awsApiVersions.cloudwatch
    });
    const res = await getApplicationResources(accountId, applicationName, '[distribution_id]');
    
    if (res.error) {
      return res
    };

    const distributionId = res.outputs;

    const params = {
      StartTime : startTime,
      EndTime: endTime,
      MetricName: "BytesDownloaded",
      Namespace: "AWS/CloudFront",
      Period: "2592000",
      Dimensions: [
        {
          Name: "DistributionId",
          Value: distributionId
        },
        {
          Name: "Region",
          Value: "Global"
        }
      ],
      Statistics: [ "Sum" ],
      Unit: "None"
    }
    const data = await cloudwatch.getMetricStatistics(params).promise();

    const usage = data.Datapoints.reduce((acc, curr) => {
      return acc + curr.Sum
    }, 0)

    return {
      success: true,
      outputs: {
        applicationName,
        domainName,
        usage,
      }
    }
  } catch (error) {
    console.log(`Error in getting bandwidth usage: ${error}`)
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
    }
  }
}
//--------------------------------------------------------
async function getApplicationResources(accountId, applicationName, fields) {
  
  AWS.config.update({
    region: config.utopiopsProviderRegion,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

  const s3 = new AWS.S3({
    apiVersion: awsApiVersions.s3
  });
  
  try {
    const params = {
      Bucket: config.utopiopsProviderBucket,
      Key: `utopiops-water/utopiops-applications/static-webstie/account/${accountId}/application/${applicationName}`
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
		else if (fields === '[distribution_id]') {
			return {
				success: true,
				outputs: state.outputs.distribution_id.value
			}
		}
    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
			};
    }
    return {
      error: {
        message: 'Something went wrong',
        statusCode: constants.statusCodes.ise
      }
    }
  }
}

