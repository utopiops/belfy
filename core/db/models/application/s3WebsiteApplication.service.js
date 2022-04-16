const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const yup = require('yup');
const Application = require('./application');
const S3WebsiteApplication = require('./s3WebsiteApplication');
const ApplicationVersion = require('./applicationVersion');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
  createS3WebsiteApplication,
  addS3WebsiteApplicationVersion,
  updateS3WebsiteApplication,
  createPipeline,
  createDynamicApplicationPipeline
}

async function createS3WebsiteApplication(environmentId, appName, description, appVersion, isDynamicApplication) {
  let step = 0;
  try {
    const newApp = {
      environment: environmentId,
      name: appName,
      jobName: appVersion.jobName,
      repositoryUrl: appVersion.repositoryUrl,
      integrationName: appVersion.integrationName,
      description,
      kind: constants.applicationKinds.s3Website,
      isDynamicApplication
    };
    const app = new Application(newApp);
    await app.save();
    step++;

    appVersion.environmentApplication = app._id;

    const doc = new S3WebsiteApplication(appVersion);
    await doc.save();
    step++;

    let appId = doc._id;
    console.log(`appId`, appId);

    const filter = { _id: app._id };
    const update = {
        '$push':
        {
            'versions': appId
        }
    };
    const updated = await Application.findOneAndUpdate(filter, update, { new: true }).exec();
    if (updated == null) {
      return {
        success: false,
        error: {
          message: 'Failed to update',
          statusCode: constants.statusCodes.ise
        }
      }
    }
    return {
        success: true,
        outputs: { version: doc.version }
    };

  } catch (err) {
    console.log(`error`, err.message);
    try {
        if (step > 0) {
            // rollback the first part (application insert)
            await Application.findOneAndDelete({ environment: environmentId, name: appName }).exec();
        }
        if (step > 1) {
            // rollback the second part (application version insert)
            await S3WebsiteApplication.findOneAndDelete({ _id: appId }).exec(); // todo: fix this
        }
    } catch (e) {
        let message = err.message;
        return {
          success: false,
          error: {
            message,
            statusCode: constants.statusCodes.ise
          }
        };
    }
    let message = err.message;
    let statusCode;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
      statusCode = constants.statusCodes.duplicate;
    }
    return {
      success: false,
      error: {
        message,
        statusCode
      }
    };
  }
}
//-------------------------------------
async function addS3WebsiteApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
  let step = 0;
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.s3Website
      };
      const app = await Application.findOneAndUpdate(filter, { description }, { new: true }).exec();
      if (app == null) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
      }
      // Check if an application-version with the specified version exists for this environment application
      const appVersionFilter = {
          environmentApplication: app._id,
          version: fromVersion
      };
      const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec()
      if (appVer == null) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
      }
      // Find the biggest version for this environment application
      const maxFilter = {
          environmentApplication: app._id
      };
      const max = await ApplicationVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
      if (max == null) {
        return {
          success: false,
        };
      }


      // Increase the version by 1 and add the new application version
      appVersion.environmentApplication = app._id;
      appVersion.fromVersion = fromVersion;
      appVersion.version = max.version + 1;

      if (appVersion.dnsSettings && appVersion.dnsSettings.albId) { // TODO: WTF?
          appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
      }
      appVersion.clusterId = ObjectId(appVersion.clusterId); // TODO: WTF?
      delete appVersion._id; // TODO: don't send appVersion._id to front end so you don't need to delete it here
      const doc = new S3WebsiteApplication(appVersion);
      await doc.save();
      step++;

      let appId = doc._id;
      
      // Push the version to the environment application versions
      const update = {
          '$push':
          {
              'versions': appId
          }
      };
      const updated = await Application.findOneAndUpdate({ _id: app._id }, update, { new: true }).exec();
      if (updated == null) {
        return {
          success: false,
          error: {
            message: 'Failed to update',
            statusCode: constants.statusCodes.ise
          }
        }
      }
      return {
          success: true,
          outputs: { version: doc.version }
      };

  } catch (err) {
      console.log(`error`, err.message);
      try {
          if (step > 1) {
              // rollback the application version insert
              await S3WebsiteApplication.findOneAndDelete({ _id: appId }).exec();
          }
      } catch (e) {
          let message = err.message;
          return {
            success: false,
            error: {
              message,
              statusCode: constants.statusCodes.ise
            }
          };
      }
      let message = err.message;
      let statusCode;
      if (err.code && err.code === 11000) {
          message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the same time and the new version becomes equal for both!!!
          statusCode = constants.statusCodes.duplicate
      }
      return {
        success: false,
        error: {
          message,
          statusCode
        }
      };
  }

}
//-------------------------------------
async function updateS3WebsiteApplication(environmentId, appName, description, appVersion) {
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.s3Website
      };
      const app = await Application.findOneAndUpdate(filter, { description }, { new: true }).exec();
      if (app == null) {
        return {
          success: false,
          error: {
            message: constants.errorMessages.models.elementNotFound,
            statusCode: constants.statusCodes.badRequest
          }
        };
      }
      // If an application-version with the specified version which has never been activated exists for this environment application update it
      const appVersionFilter = {
          environmentApplication: app._id,
          version: appVersion.version,
          isActivated: false
      };
      const doc = await S3WebsiteApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
      if (doc == null) {
          return {
            success: false,
            error: {
              message: constants.errorMessages.models.elementNotFound,
              statusCode: constants.statusCodes.badRequest
            }
          };
      }
      return {
          success: true,
          outputs: { version: appVersion.version }
      };

  } catch (err) {
      console.log(`error`, err.message);
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
//---------------------------------------------------------------------------------------
async function createPipeline(accountId, userId, environmentId, applicationName, credentials, headers) {
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
      name: applicationName,
      repositoryUrl: { $exists: true },
      kind: constants.applicationKinds.s3Website
    };
    const app = await Application.findOne(filter, { _id: 1, activeVersion: 1 })
      .populate('environment', 'hostedZone name domain')
      .exec();
    if (app == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const appVersionFilter = {
      environmentApplication: app._id,
      version: app.activeVersion
    };
    const appVersion = await S3WebsiteApplication.findOne(appVersionFilter).exec();
    if (appVersion == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const dns = app.environment.domain.dns;
    const environmentName = app.environment.name

    // This is temporary
		// We check if the repo is based on angular, gatsby, etc... and we install the right cli in the container

    const params = {
      kind: appVersion.kind,
      buildCommand: appVersion.buildCommand,
      integrationName: appVersion.integrationName,
      repositoryUrl: appVersion.repositoryUrl,
      branch: appVersion.branch,
      jobName: appVersion.jobName,
      accountId,
      userId,
      environmentName,
      environmentId,
      applicationName,
      credentials,
      dns,
      isParameterized: true,
    }

    await http.post(`${config.ciHelperUrl}/job/create`, params, {
      headers,
    });

    return {
      success: true
    };

  } catch (error) {
    console.log(`Error in s3 website pipeline creation: ${error.message}`);
    return {
      error: {
        message: error.message,
        statusCode: constants.statusCodes.ise
      }
    };
  }
}
//---------------------------------------------------
async function createDynamicApplicationPipeline(accountId, userId, environmentId, applicationName, dynamicName, credentials, headers) {
  try {
    if (process.env.IS_LOCAL) {
      // Pipeline creation is not supported in local environment
      return {
        success: true,
      };
    }
    // Check if the application exists (get it's _id)
    const filter = {
      environment: environmentId,
      name: applicationName,
      repositoryUrl: { $exists: true },
      kind: constants.applicationKinds.s3Website,
      isDynamicApplication: true,
      dynamicNames: { 
        $elemMatch: { 
          name: dynamicName,
          jobName: { $ne: ''}
        } 
      },
    };
    const app = await Application.findOne(filter, { _id: 1, activeVersion: 1, dynamicNames: 1 })
      .populate('environment', 'domain name')
      .exec();
    if (app == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const index = app.dynamicNames.findIndex(dn => dn.name === dynamicName);

    const appVersionFilter = {
      environmentApplication: app._id,
      version: app.dynamicNames[index].deployedVersion,
    };
    const appVersion = await S3WebsiteApplication.findOne(appVersionFilter).exec();
    if (appVersion == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const dns = app.environment.domain.dns;
    const environmentName = app.environment.name

    // This is temporary
		// We check if the repo is based on angular, gatsby, etc... and we install the right cli in the container
  
    const params = {
      kind: appVersion.kind,
      dynamicName,
      buildCommand: appVersion.buildCommand,
      integrationName: appVersion.integrationName,
      repositoryUrl: appVersion.repositoryUrl,
      jobName: app.dynamicNames[index].jobName,
      accountId,
      userId,
      environmentName,
      environmentId,
      applicationName,
      credentials,
      dns,
      isParameterized: false,
    }

    await http.post(`${config.ciHelperUrl}/job/create`, params, {
      headers,
    });

    return {
      success: true
    };

  } catch (error) {
    console.log(`Error in s3 website dynamic application pipeline creation: ${error.message}`);
    return {
      error: {
        message: error.message,
        statusCode: constants.statusCodes.ise
      }
    };
  }
}