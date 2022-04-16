'use strict';
const constants = require('../../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const EnvironmentV2Model = require('./environment');
const mongoose = require('mongoose');

module.exports = {
	updateVersion,
	cloneVersion
}

///----------------------- Helpers
/**
 * @param  {string} accountId - The account ID of the environment
 * @param  {string} environmentName - The name of the environment
 * @param  {object} filter - A filter with Mongoose format. accountId and name are already set in the filter.
 * @param  {object} update - A mongoose update object
 * @param  {string} version - The version of the environment on which the update should apply
 * @param  {boolean} isAdd - Indicates if a new version of environment should be created if true, otherwise the update should be applied on an existing version of environment
 * @param  {boolean} isRaw
 * @param  {string} kind - It's kind of provider
 * @param  {object} extras={} - Extra parameters passed to the findOneAndUpdate method
 */
 async function updateVersion(accountId, environmentName, filter, update, version, isAdd, isRaw, kind, extras = {}) {
	if (isAdd) {
		const result = await cloneVersion(accountId, environmentName, version);
		if (!result.success) {
			return result;
		} else {
			version = result.outputs.newVersion;
			if (filter.versions)
				if (filter.versions['$elemMatch'])
					if (filter.versions['$elemMatch'].version) filter.versions['$elemMatch'].version = Number(version);
		}
	}

	if (extras.updateExtras) {
		if (extras.updateExtras.arrayFilters) {
			extras.updateExtras.arrayFilters.push({ 'i.version': Number(version) });
		} else {
			extras.updateExtras.arrayFilters = [ { 'i.version': Number(version) } ];
		}
	} else {
		extras.updateExtras = { arrayFilters: [ { 'i.version': Number(version) } ] };
	}
	const adjustedFilter = {
		accountId: ObjectId(accountId),
		name: environmentName,
    kind,
		versions: { $elemMatch: { version: Number(version), isActivated: false } },
		...filter
	};
  console.log('filter: ', JSON.stringify(adjustedFilter))///A
	try {
		let doc;
		if (isRaw) {
			if (extras.updateExtras) {
				doc = await mongoose.connection.db
					.collection('environment_v2')
					.findOneAndUpdate(adjustedFilter, update, { new: true, ...extras.updateExtras });
			} else {
				doc = await mongoose.connection.db
					.collection('environment_v2')
					.findOneAndUpdate(adjustedFilter, update, { new: true });
			}
		} else {
			if (extras.updateExtras) {
				doc = await EnvironmentV2Model.findOneAndUpdate(adjustedFilter, update, {
					new: true,
					...extras.updateExtras
				}).exec();
			} else {
				doc = await EnvironmentV2Model.findOneAndUpdate(adjustedFilter, update, { new: true }).exec();
			}
		}

		console.log(`doc::`, JSON.stringify(doc, null, 2));

		if ((isRaw && doc.value == null) || (!isRaw && doc == null)) {
			if (isAdd) {
				await EnvironmentV2Model.findOneAndUpdate(
					{
						accountId: ObjectId(accountId),
						name: environmentName
					},
					{
						$pull: { versions: { version: version } }
					}
				);
			}
			return {
				success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
			};
		}
		return {
			success: true
		};
	} catch (err) {
		console.error(`error: `, err);
		return {
			success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message: err.message
      }
		};
	}
}

/* Adds a new version to the environment, cloned from the @version */
async function cloneVersion(accountId, environmentName, version) {
	// Find the largest value of the versions for this environment application
	const maxFilter = {
		accountId: accountId,
		name: environmentName
	};

	try {
		const max = await EnvironmentV2Model.findOne(maxFilter, { versions: 1 }).exec();
		console.log('max....', max);
		if (max == null) {
			return {
				success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
			};
		}

		const doc = await EnvironmentV2Model.findOne({ ...maxFilter, 'versions.version': version }).exec();
		if (doc == null) {
			return {
				success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: constants.errorMessages.models.elementNotFound
        }
			};
		}

		const docJson = doc.toJSON();
		const idx = docJson.versions.findIndex((v) => v.version == version);
		const newVersion = docJson.versions[idx];

		delete newVersion._id;
		newVersion.version = max.versions.length + 1;
		newVersion.fromVersion = version;
		newVersion.isActivated = false;

		const updateQuery = {
			$push: {
				versions: newVersion
			}
		};
		await EnvironmentV2Model.findOneAndUpdate(maxFilter, updateQuery, { new: true }).exec();
		return {
			success: true,
			outputs: {
				newVersion: newVersion.version
			}
		};
	} catch (error) {
		console.error('error:', error);
		return {
			success: false,
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
		};
	}
}
