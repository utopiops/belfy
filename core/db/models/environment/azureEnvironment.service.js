'use strict';
const constants = require('../../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const EnvironmentV2Model = require('./environment');
const mongoose = require('mongoose');
const {	updateVersion, cloneVersion } = require('./environmentVersion.service')
const { runQueryHelper } = require('../helpers');
const uuid = require('uuid/v4');

module.exports = {
  updateVnetDdosProtection
};

//------------------------
async function updateVnetDdosProtection(accountId, environmentName, version, isAdd, enableVnetDdosProtection) {
  const kind = constants.cloudProviders.azure;
  const update = {
		$set: {
			'versions.$[i].enableVnetDdosProtection': enableVnetDdosProtection
		}
	};
	return await updateVersion(accountId, environmentName, {}, update, version, isAdd, true, kind);
}
