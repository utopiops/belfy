const constants = require('../../../utils/constants');
const Application = require('./application');
const ClassicBakedApplication = require('./classicBakedApplication');
const ApplicationVersion = require('./applicationVersion');
const ObjectId = require('mongoose').Types.ObjectId;
const yup = require('yup');
yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

module.exports = {
  createClassicBakedApplication,
  addClassicBakedApplicationVersion,
  updateClassicBakedApplication
}

async function createClassicBakedApplication(environmentId, appName, description, isDynamicApplication, appVersion) {
  let step = 0;
  let appId;
  try {
      const newApp = {
          environment: environmentId,
          name: appName,
          description,
          kind: constants.applicationKinds.classicBaked,
          isDynamicApplication
      };
      const app = new Application(newApp);
      await app.save();
      step++;

      appVersion.environmentApplication = app._id;

      const doc = new ClassicBakedApplication(appVersion);
      await doc.save();
      step++;
      appId = doc._id;

      const filter = { _id: app._id };
      const update = {
          '$push':
          {
              'versions': appId
          }
      };
      const updated = Application.findOneAndUpdate(filter, update, { new: true }).exec();
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
          outputs: {
              version: doc.version
          },
          success: true
      };

  } catch (err) {
      console.log(`error`, err.message);
      try {
          if (step > 0) {
              // rollback the first part (application insert)
              const r = await Application.findOneAndDelete({ environment: environmentId, name: appName }).exec();
              console.log("r:",r);
          }
          if (step > 1) {
              // rollback the second part (application version insert)
              await ClassicBakedApplication.findOneAndDelete({ _id: appId }).exec();
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
async function addClassicBakedApplicationVersion(environmentId, appName, description, appVersion, fromVersion) {
  let step = 0;
  let appId;
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.classicBaked
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
      const appVer = await ApplicationVersion.findOne(appVersionFilter, { _id: 1 }).exec();
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
              success: false
          };
      }


      // Increase the version by 1 and add the new application version
      appVersion.environmentApplication = app._id;
      appVersion.fromVersion = fromVersion;
      appVersion.version = max.version + 1;

      if (appVersion.dnsSettings && appVersion.dnsSettings.albId) {
          appVersion.dnsSettings.albId = ObjectId(appVersion.dnsSettings.albId);
      }
      appVersion.clusterId = ObjectId(appVersion.clusterId);
      
      delete appVersion._id; // TODO: don't send appVersion._id to front end so you don't need to delete it here
      const doc = new ClassicBakedApplication(appVersion);
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
      if (!updated) {
        return {
          success: false,
          error: {
            message: 'Failed to update',
            statusCode: constants.statusCodes.ise
          }
        }
      }
      return {
          outputs: {
              version: doc.version
          },
          success: true
      };

  } catch (err) {
      console.log(`error`, err.message);
      try {
          if (step > 1) {
              // rollback the application version insert
              await ClassicBakedApplication.findOneAndDelete({ _id: appId }).exec();
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
async function updateClassicBakedApplication(environmentId, appName, description, appVersion) {
  try {
      // Check if the environment application exists (get it's _id)
      const filter = {
          environment: environmentId,
          name: appName,
          kind: constants.applicationKinds.classicBaked
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
      const doc = await ClassicBakedApplication.findOneAndUpdate(appVersionFilter, appVersion, { new: true }).exec();
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
      return {
          outputs: {
              version: appVersion.version
          },
          success: true
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