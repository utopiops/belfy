const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const Application = require('./application');
const EcsApplication = require('./ecsApplication');
const ApplicationVersion = require('./applicationVersion');

module.exports = {
  createEcsApplication,
  addEcsApplicationVersion,
  updateEcsApplication,
  createPipeline,
  createDynamicApplicationPipeline
}

async function createEcsApplication(environmentId, app_name, description, isDynamicApplication, appVersion) {
  let step = 0;
  let appId;
  try {
      const newApp = {
          environment: environmentId,
          name: app_name,
          jobName: appVersion.jobName,
          repositoryUrl: appVersion.repositoryUrl,
          integrationName: appVersion.integrationName,
          description,
          kind: constants.applicationKinds.ecs,
          isDynamicApplication
      };
      const app = new Application(newApp);
      await app.save();
      step++;

      appVersion.environmentApplication = app._id;

      const doc = new EcsApplication(appVersion);
      await doc.save();
      step++;

      appId = doc._id;
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
              await Application.findOneAndDelete({ environment: environmentId, name: app_name }).exec();
          }
          if (step > 1) {
              // rollback the second part (application version insert)
              await EcsApplication.findOneAndDelete({ _id: appId }).exec();
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
      let statusCode = constants.statusCodes.ise;
      if (err.code && err.code === 11000) {
          message = constants.errorMessages.models.duplicate;
          statusCode = constants.statusCodes.badRequest;
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
async function addEcsApplicationVersion(environmentId, app_name, description, appVersion, fromVersion) {
  let step = 0;
  let appId;
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: app_name,
          kind: constants.applicationKinds.ecs
      };
      const app = await Application.findOneAndUpdate(filter, { description }, { new: true }).exec();
      if (app == null) {
          return {
              success: false,
              message: constants.errorMessages.models.elementNotFound
          };
      }
      // Check if an application-version with the specified version exists for this environment application
      const appVersionFilter = {
          environmentApplication: app._id,
          version: fromVersion
      };
      const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec();
      if (appVer == null) {
          return {
              success: false,
              message: constants.errorMessages.models.elementNotFound
          };
      }
      // Find the biggest version for this environment application
      const maxFilter = {
          environmentApplication: app._id
      };
      const max = await ApplicationVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
      if (max == null) {
          return {
              success: false
          };
      }

      // Increase the version by 1 and add the new application version
      appVersion.environmentApplication = app._id;
      appVersion.fromVersion = fromVersion;
      appVersion.version = max.version + 1;

      const doc = new EcsApplication(appVersion);
      await doc.save();
      step++;

      appId = doc._id;

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
              await EcsApplication.findOneAndDelete({ _id: appId }).exec();
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
      if (err.code && err.code === 11000) {
        message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the same time and the new version becomes equal for both!!!
      }
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
async function updateEcsApplication(environmentId, app_name, description, appVersion) {
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: app_name,
          kind: constants.applicationKinds.ecs
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
      const doc = await EcsApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
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
async function createPipeline(accountId, userId, environmentId, applicationName, region, cloudProviderAccountId, credentials, headers) {
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
        kind: constants.applicationKinds.ecs
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
      const appVersion = await EcsApplication.findOne(appVersionFilter).exec();
      if (appVersion == null) {
        return {
          error: {
            message: constants.errorMessages.models.elementNotFound,
            statusCode: constants.statusCodes.badRequest
          }
        };
      }

      const environmentName = app.environment.name
      const ecrRegistryUrl = `${cloudProviderAccountId}.dkr.ecr.${region}.amazonaws.com`
      const containerName = appVersion.containers.find(c => !c.image).name
      const repositoryName = `${environmentName}-${applicationName}-${containerName}`
  
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


          const params = {
            jobName: appVersion.jobName,
            integrationName: appVersion.integrationName,
            repositoryUrl: appVersion.repositoryUrl,
            repositoryUrlWithToken: repositoryUrl,
            accountId,
            userId,
            environmentName,
            environmentId,
            applicationName,
            credentials,
            region,
            ecrRegistryUrl,
            repositoryName,
            containerName,
            kind: constants.applicationKinds.ecs,
            branch: appVersion.branch,
            isParameterized: true,
          };

          await http.post(`${config.ciHelperUrl}/job/create`, params, {
            headers,
          });

          return {
            success: true,
          };
  
    } catch (error) {
      console.log(`Error in ecs pipeline creation: ${error.message}`);
      return {
        error: {
          message: error.message,
          statusCode: constants.statusCodes.ise
        }
      };
    }
  }
//---------------------------------------------------------------
async function createDynamicApplicationPipeline(accountId, userId, environmentId, applicationName, dynamicName, region, cloudProviderAccountId, credentials, headers) {
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
      kind: constants.applicationKinds.ecs,
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
    const appVersion = await EcsApplication.findOne(appVersionFilter).exec();
    if (appVersion == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }

    const environmentName = app.environment.name
    const ecrRegistryUrl = `${cloudProviderAccountId}.dkr.ecr.${region}.amazonaws.com`
    const containerName = appVersion.containers.find(c => !c.image).name
    const repositoryName = `${environmentName}-${applicationName}-${dynamicName}-${containerName}`

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
  

        const params = {
          jobName: app.dynamicNames[index].jobName,
          integrationName: appVersion.integrationName,
          repositoryUrl: appVersion.repositoryUrl,
          repositoryUrlWithToken: repositoryUrl,
          accountId,
          userId,
          environmentName,
          applicationName,
          credentials,
          region,
          ecrRegistryUrl,
          repositoryName,
          containerName,
          dynamicName,
          branch: appVersion.branch,
          kind: constants.applicationKinds.ecs,
          isParameterized: false,
        };

        await http.post(`${config.ciHelperUrl}/job/create`, params, {
          headers,
        });

        return {
          success: true,
        };

  } catch (error) {
    console.log(`Error in ecs dynamic application pipeline creation: ${error.message}`);
    return {
      error: {
        message: error.message,
        statusCode: constants.statusCodes.ise
      }
    };
  }
}