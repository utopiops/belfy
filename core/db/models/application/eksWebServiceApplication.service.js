const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const HttpService = require('../../../utils/http/index');
const http = new HttpService();
const Application = require('./application');
const EksWebServiceApplication = require('./eksWebServiceApplication');
const ApplicationVersion = require('./applicationVersion');
const { getKubernetesClusterResources } = require('../kubernetes/kubernetesCluster.service');

module.exports = {
  createEksWebServiceApplication,
  addEksWebServiceApplicationVersion,
  updateEksWebServiceApplication,
  createPipeline
}

async function createEksWebServiceApplication(environmentId, environmentName, accountId, userId, app_name, description, isDynamicApplication, appVersion, credentials, region, cloudProviderAccountId, bucketName, headers) {
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
          kind: constants.applicationKinds.eksWebService,
          isDynamicApplication,
          activeVersion: 1,
          deployedVersion: 1
      };
      const app = new Application(newApp);
      await app.save();
      step++;

      appVersion.environmentApplication = app._id;
      appVersion.isActivated = true;

      const doc = new EksWebServiceApplication(appVersion);
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
      

      const fields = '[eks_cluster_name]';
      const resource = await getKubernetesClusterResources(environmentName, appVersion.eks_cluster_name, credentials, region, bucketName, fields)
      const repositoryName = resource.outputs;

      await createPipeline(accountId, userId, environmentId, app_name, region, cloudProviderAccountId, credentials, repositoryName, headers);
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
              await EksWebServiceApplication.findOneAndDelete({ _id: appId }).exec();
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
async function addEksWebServiceApplicationVersion(environmentId, app_name, description, appVersion, fromVersion) {
  let step = 0;
  let appId;
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: app_name,
          kind: constants.applicationKinds.eksWebService
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

      const doc = new EksWebServiceApplication(appVersion);
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
              await EksWebServiceApplication.findOneAndDelete({ _id: appId }).exec();
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
async function updateEksWebServiceApplication(environmentId, app_name, description, appVersion) {
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: app_name,
          kind: constants.applicationKinds.eksWebService
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
      const doc = await EksWebServiceApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
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
async function createPipeline(accountId, userId, environmentId, applicationName, region, cloudProviderAccountId, credentials, repositoryName, headers) {
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
        kind: constants.applicationKinds.eksWebService
      };

      const app = await Application.findOne(filter, { _id: 1, activeVersion: 1 })
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
      const appVersionFilter = {
        environmentApplication: app._id,
        version: app.activeVersion
      };
      const appVersion = await EksWebServiceApplication.findOne(appVersionFilter).exec();
      if (appVersion == null) {
        return {
          error: {
            message: constants.errorMessages.models.elementNotFound,
            statusCode: constants.statusCodes.badRequest
          }
        };
      }

      const environmentName = app.environment.name;

      const params = {
        kind: constants.applicationKinds.eksWebService,
        repositoryUrl: appVersion.repositoryUrl,
        integrationName: appVersion.integrationName,
        jobName: appVersion.jobName,
        branch: appVersion.branch,
        isParameterized: true,
        region,
        accountId,
        credentials,
        cloudProviderAccountId,
        userId,
        environmentId,
        applicationName,
        environmentName,
        repositoryName
      }

      await http.post(`${config.ciHelperUrl}/job/create`, params, {
        headers,
      });

      return {
        success: true
      };
  
    } catch (error) {
      console.log(`Error in eks website pipeline creation: ${error.message}`);
      return {
        error: {
          message: error.message,
          statusCode: constants.statusCodes.ise
        }
      };
    }
  }