const constants = require('../../../utils/constants');
const { defaultLogger: logger } = require('../../../logger');
const { runQueryHelper } = require('../helpers');
const StaticWebsiteModel = require('./staticWebsiteApplication');
const UtopiopsApplicationModel = require('./utopiopsApplication');
const UtopiopsApplicationService = require('./utopiopsApplication.service');
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const config = require('../../../utils/config').config;
const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const ObjectId = require('mongoose').Types.ObjectId;


exports.createStaticWebsiteApplication = createStaticWebsiteApplication;
exports.updateStaticWebsiteApplication = updateStaticWebsiteApplication;
exports.checkNameAvailablity = checkNameAvailablity;
exports.uploadStaticWebsite = uploadStaticWebsite;
exports.claimStaticWebsiteApplication = claimStaticWebsiteApplication;
exports.emptyBucket = emptyBucket;

//-----------------------------------------------------------------------
async function createStaticWebsiteApplication(app, headers) {
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

		// This is the string used in the URL of the website
		app.jobName = app.name; // TODO: delete jobname when all of the apps had same name and jobname

		app.domain = `https://${app.name + config.staticWebsiteSubdomain}.utopiops.com`;

		const result = await createPipeline(app, headers)
		if (result.error) return result

		const res = await StaticWebsiteModel.create(app);
    if (!res || res.error) {
      return res;
    }

    await UtopiopsApplicationService.startApplicationPlan(app.accountId, app.name, '', constants.applicationKinds.staticWebsite);

    return {
      success: true,
    }
	};

	return await runQueryHelper(runQuery);
}
//-----------------------------------------------------------------------
async function updateStaticWebsiteApplication(app, headers) {
	try {
		const filter = {
			name: app.name,
			accountId: app.accountId,
			kind: constants.applicationKinds.staticWebsite
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

		const res = await UtopiopsApplicationService.deletePipeline(updatedApp.accountId, updatedApp.name, headers)
		if (res.error) return res

		const result = await createPipeline(updatedApp, headers)
		if (result.error) return result

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
//-----------------------------------------------------------------------
async function createPipeline(app, headers) {
  try {
    if (process.env.IS_LOCAL) {
      // Pipeline creation is not supported in local environment
      return {
        success: true,
      };
    }

    app.kind = constants.applicationKinds.staticWebsite;
    const params = { ...app, isParameterized: false };

    await http.post(`${config.ciHelperUrl}/job/create`, params, {
      headers,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error(`Error in pipeline creation: ${error.message}`);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message,
      },
    };
  }
}
//----------------------------------------------------------------------------
async function checkNameAvailablity(name) {
	try {
		// Check if application name already exists
		const filter = {
			name
		}

		const doc = await StaticWebsiteModel.findOne(filter);
		if(doc) {
			return {
				error: {
					statusCode: constants.statusCodes.badRequest,
					message: 'This name is taken.'
				}
			}
		}

		return {
			success: true
		}
		
	} catch (error) {
		logger.error(`Error in checking name availablity: ${error.message}`)
		return {
			error: {
				statusCode: constants.statusCodes.ise,
				message: error.message
			}
		}
	}
}
//----------------------------------------------------------------------------
async function uploadStaticWebsite(appName) {
  try {
    const app = {
      accountId: new ObjectId('000000000000000000000000'), //will be changed after claim
      name: appName,
      domain: `https://${appName + config.staticWebsiteSubdomain}.utopiops.com`,
      branch: 'no-branch',
      outputPath: './',
      repositoryUrl: 'no-repository',
    };

    await StaticWebsiteModel.create(app);

    AWS.config.update({
      	region: config.utopiopsProviderRegion,
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

	// TODO: check if record sets are already set (its highly unlikely tho)
    const route53 = new AWS.Route53({ apiVersion: awsApiVersions.route53 });
    const route53Params = {
      ChangeBatch: {
        Comment: 'Creating Alias resource record sets in Route 53',
        Changes: [
          {
            Action: 'CREATE',
            ResourceRecordSet: {
              Name: `${appName + config.staticWebsiteSubdomain}.utopiops.com`,
              AliasTarget: {
                HostedZoneId: 'Z2FDTNDATAQYW2',
                DNSName: `${config.staticWebsiteCloudfrontDnsName}`,
                EvaluateTargetHealth: false,
              },
              Type: 'A',
            },
          },
        ],
      },
      HostedZoneId: config.staticWebsiteHostedZoneId,
    };
    await route53.changeResourceRecordSets(route53Params).promise();

    return {
      success: true,
	  outputs: {
		  url: app.domain,
		  appName,
	  }
    };
  } catch (error) {
    logger.error(`Error in uploading static website: ${error.message}`);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message,
      },
    };
  }
}
//----------------------------------------------------------------------------
async function claimStaticWebsiteApplication(accountId, appName) {
	try {
	const filter = {
	  name: appName,
	  accountId: new ObjectId('000000000000000000000000')
	};
	const update = {
	  accountId: new ObjectId(accountId),
	};
	const options = {
	  new: true,
	};
	const doc = await StaticWebsiteModel.findOneAndUpdate(filter, update, options);
	if (!doc) {
	  return {
		error: {
		  statusCode: constants.statusCodes.notFound,
		  message: 'Application not found.',
		},
	  };
	}
	return {
	  success: true,
	};
  } catch (error) {
	logger.error(`Error in claiming static website: ${error.message}`);
	return {
	  error: {
		statusCode: constants.statusCodes.ise,
		message: error.message,
	  },
	};
  }
}
//----------------------------------------------------------------------------
async function emptyBucket(s3, prefix) {
    const params = {
      Bucket: process.env.STATIC_WEBSITE_BUCKET,
      Prefix: prefix,
    };
    const listObjects = await s3.listObjects(params).promise();
    if (listObjects.Contents.length === 0) return;
    const deleteParams = {
      Bucket: process.env.STATIC_WEBSITE_BUCKET,
      Delete: {
        Objects: listObjects.Contents.map((content) => ({ Key: content.Key })),
        Quiet: true,
      },
    };
    await s3.deleteObjects(deleteParams).promise();
}