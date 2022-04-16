const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const yup = require('yup');
const Application = require('./application');
const AzureStaticWebsiteApplication = require('./azureStaticWebsiteApplication');
const ApplicationVersion = require('./applicationVersion');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = {
  createApplication,
  addApplicationVersion,
  updateApplication,
  createPipeline,
  disableAzureHttps,
  checkAzureHttpsDisabled
}

async function createApplication(environmentId, appName, description, appVersion, isDynamicApplication) {
  let step = 0;
  try {
    const newApp = {
      environment: environmentId,
      name: appName,
      jobName: appVersion.jobName,
      repositoryUrl: appVersion.repositoryUrl,
      integrationName: appVersion.integrationName,
      description,
      kind: constants.applicationKinds.azureStaticWebsite,
      isDynamicApplication
    };
    const app = new Application(newApp);
    await app.save();
    step++;

    appVersion.environmentApplication = app._id;

    const doc = new AzureStaticWebsiteApplication(appVersion);
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
            await AzureStaticWebsiteApplication.findOneAndDelete({ _id: appId }).exec(); // todo: fix this
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
async function addApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
  let step = 0;
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.azureStaticWebsite
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
      const doc = new AzureStaticWebsiteApplication(appVersion);
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
              await AzureStaticWebsiteApplication.findOneAndDelete({ _id: appId }).exec();
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
async function updateApplication(environmentId, appName, description, appVersion) {
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.azureStaticWebsite
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
      const doc = await AzureStaticWebsiteApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
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
//-------------------------------------
async function disableAzureHttps() {
  return {
    success: true,
  };
}
//-------------------------------------
async function checkAzureHttpsDisabled() {
  return {
    success: true,
  };
}
//---------------------------------------------------------------------------------------
async function createPipeline(accountId, userId, environmentId, applicationName, credentials, headers) {
  try {
    // Check if the application exists (get it's _id)
    const filter = {
      environment: environmentId,
      name: applicationName,
      repositoryUrl: { $exists: true },
      kind: constants.applicationKinds.azureStaticWebsite
    };
    const app = await Application.findOne(filter, { _id: 1, activeVersion: 1 })
      .populate('environment', 'hostedZone name')
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
    const appVersion = await AzureStaticWebsiteApplication.findOne(appVersionFilter).exec();
    if (appVersion == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const hostedZone = app.environment.hostedZone
    const environmentName = app.environment.name
    const releaseBucket = `${applicationName}.${hostedZone.isCrossAccount ? environmentName + '.' : ''}${hostedZone.parentDomain}-releases`

    // This is temporary
		// We check if the repo is based on angular, gatsby, etc... and we install the right cli in the container

		let installCliStage = ``;
		
		const commands = ['gatsby', 'ng'];

		const clis = {
			gatsby: 'gatsby-cli',
			ng: '@angular/cli'
		};

		let cli = ``;
		for(let c of commands) {
			let reg = new RegExp("\\b(" + c + ")\\b", "i");
			if(reg.test(appVersion.buildCommand)) {
				cli = clis[c];
				installCliStage = `sh 'npm install -g ${cli}'`;
			}
		}	

    let repositoryUrl;
		if (appVersion.integrationName) {
			switch (appVersion.integrationName) {
				case 'default_gitlab':
					repositoryUrl = `https://oauth2:\${GITTOKEN}@${appVersion.repositoryUrl.substring(appVersion.repositoryUrl.indexOf('gitlab.com'))}`;
					break;
				case 'default_github':
					repositoryUrl = `https://\${GITTOKEN}:x-oauth-basic@${appVersion.repositoryUrl.substring(appVersion.repositoryUrl.indexOf('github.com'))}`;
					break;
				case 'default_bitbucket':
					repositoryUrl = `https://x-token-auth:\${GITTOKEN}@${appVersion.repositoryUrl.substring(appVersion.repositoryUrl.indexOf('bitbucket.org'))}`;
					break;
			}
		} else {
			repositoryUrl = appVersion.repositoryUrl;
		}

    const params = { ...appVersion, isParameterized: false }; // todo: update

    await http.post(`${config.ciHelperUrl}/job/create`, params, {
      headers,
    });

    return {
      success: true
    };

  } catch (error) {
    console.log(`Error in azure static website pipeline creation: ${error.message}`);
    return {
      error: {
        message: error.message,
        statusCode: constants.statusCodes.ise
      }
    };
  }
}