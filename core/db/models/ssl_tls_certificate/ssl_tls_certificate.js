const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const uuid = require('uuid/v4');
const timeService = require('../../../services/time.service');
const sslTlsCertificateVersionSchema = require('./ssl_tls_certificate_version');
const constants = require('../../../utils/constants');
const sslTlsCertificateStatusValues = require('./sslTlsCertificateStatusValues');
const sslTlsCertificateStates = require('./sslTlsCertificateStates');

const modelName = 'ssl_tls_certificate'

const sslTlsCertificateSchema = new Schema({
  environment: {
    type: ObjectId,
    ref: 'environment'
  },
  identifier: { // This is used as the id everywhere, we don't expose _id
    type: String,
    required: true,
    default: uuid
  },
  name: { // This is optional
    type: String
  },
  domainName: {
    type: String,
    required: true,
  },
  activeVersion: Number,
  versions: {
    type: [sslTlsCertificateVersionSchema],
    default: []
  },
  state: {
    type: {
      code: {
        type: String,
        enum: Object.values(sslTlsCertificateStates)
      },
      reason: String, // Only for deploy_failed and destroy_failed
      jobId: String // used in the virtual. Only for deploying and destroying codes this gets a value
    },
    default: {
      code: sslTlsCertificateStates.created
    }
  },
  status: {
    type: String,
    enum: Object.values(sslTlsCertificateStatusValues),
    default: sslTlsCertificateStatusValues.pending
  }
}, { timestamps: true });


sslTlsCertificateSchema.statics.createCertificate = createCertificate;
sslTlsCertificateSchema.statics.activate = activate;
sslTlsCertificateSchema.statics.listCertificate = listCertificate;
sslTlsCertificateSchema.statics.listCertificateVersions = listCertificateVersions;
sslTlsCertificateSchema.statics.getCertificate = getCertificate;
sslTlsCertificateSchema.statics.getActiveCertificateVersion = getActiveCertificateVersion;
sslTlsCertificateSchema.statics.setState = setState;
sslTlsCertificateSchema.statics.deleteCertificate = deleteCertificate;
sslTlsCertificateSchema.statics.addCertificateVersion = addCertificateVersion;
sslTlsCertificateSchema.statics.updateCertificateVersion = updateCertificateVersion;



//------------------------------------
async function createCertificate(environmentId, userId, { domainName, subjectAlternativeNames }) {
  const certificate = new this({
    environment: environmentId,
    domainName: domainName,
    versions: [
      {
        subjectAlternativeNames,
        createdBy: userId
      }
    ]
  });
  try {
    await certificate.save();
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function addCertificateVersion(environmentId, userId, { subjectAlternativeNames, identifier }, version) {

  // Find the biggest version for this environment application
  const maxFilter = {
    identifier
  };
  const max = await this.findOne(maxFilter, { versions: 1 }).exec();
  if (max == null) {
      return {
          success: false,
          message: 'Certificate not found'
      };
  }

  const filter = { environment: environmentId, identifier, 'versions.version': version };
  const updated = {
    '$push': {
      versions: {
        version: max.versions.length + 1,
        fromVersion: version,
        subjectAlternativeNames,
        createdBy: userId
      }
    }
  };
  try {
    const certificate = await this.findOneAndUpdate(filter, updated, { new: true }).exec();
    if (!certificate) {
      return {
        success: false,
        message: 'certificate not found'
      };
    }
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function updateCertificateVersion(environmentId, userId, { subjectAlternativeNames, identifier }, version) {

  const filter = { environment: environmentId, identifier, 'versions.version': version, activeVersion: { '$neq': version } };
  const updated = {
    '$set': {
      'versions.$.subjectAlternativeNames': subjectAlternativeNames
    }
  };
  try {
    const certificate = await this.findOneAndUpdate(filter, updated, { new: true }).exec();
    if (!certificate) {
      return {
        success: false,
        message: 'certificate not found'
      };
    }
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function activate(environmentId, identifier, version) {
  const filter = { environment: environmentId, identifier, 'versions.version': version };
  const updated = {
    '$set': {
      activeVersion: version,
      'versions.$.isActivated': true
    }
  };
  try {
    const certificate = await this.findOneAndUpdate(filter, updated, { new: true }).exec();
    if (!certificate) {
      return {
        success: false,
        message: 'certificate not found'
      };
    }
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function setState(environmentId, identifier, state) {

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
      validCurrentState = [null, 'created', 'destroyed', 'destroy_failed', 'deploy_failed']
      break;
  }


  const filter = { environment: environmentId, identifier, 'state.code': { $in: validCurrentState } };

  try {
    const certificate = await this.findOneAndUpdate(filter, { state }, { new: true }).exec();
    if (!certificate) {
      return {
        success: false,
        message: 'certificate not found'
      };
    }
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function deleteCertificate(environmentId, identifier, state) {

  const filter = { environment: environmentId, identifier, 'state.code': { $nin: [sslTlsCertificateStates.deployed, sslTlsCertificateStates.deployFailed] } };

  try {
    const certificate = await this.findOneAndDelete(filter, { state }, { new: true }).exec();
    if (!certificate) {
      return {
        success: false,
        message: 'Certificate not found or cannot be deleted'
      };
    }
    return {
      success: true
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false
    }
  }
}
//------------------------------------
async function listCertificate(environmentIds) {
  const filter = { environment: { $in: environmentIds } };

  try {

    const certificates = await this.find(filter, { identifier: 1, domainName: 1, status: 1, activeVersion: 1, 'state.code': 1 })
      .populate('environment', 'name hostedZone')
      .exec();
    if (certificates == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        certificates: certificates.map(c => {
          const cert = c.toJSON();
          cert.environment = c.environment.name;
          cert.domainName = `${c.domainName}.${c.environment.hostedZone.name}`
          return cert;
        })
      }
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false,
      message: e.message
    }
  }
}
//------------------------------------
async function listCertificateVersions(environmentId, identifier) {
  const filter = { environment: environmentId, identifier };

  try {

    const certificate = await this.findOne(filter, { 'versions.version': 1, 'versions.fromVersion': 1, 'versions.createdAt': 1 })
      .exec();
    if (certificate == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        versions: certificate.versions
      }
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false,
      message: e.message
    }
  }
}
//------------------------------------
async function getCertificate(environmentId, identifier, version) {
  const filter = { environment: environmentId, identifier, 'versions.version': version };

  try {
    const certificate = await this.findOne(filter, {
      identifier: 1,
      name: 1,
      domainName: 1,
      status: 1,
      activeVersion: 1,
      versions: 1,
    }).populate('environment', 'name hostedZone')
      .exec();
    if (certificate == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    // eslint-disable-next-line no-unused-vars
    let { versions, environment, ...rest } = certificate.toJSON();
    let certificateDetails = { ...versions[0], ...rest };
    certificateDetails.domainName = `${certificate.domainName}.${certificate.environment.hostedZone.name}`;
    certificateDetails.hostedZoneName = certificate.environment.hostedZone.name; // This is used in Terraform (inf-worker)
    return {
      success: true,
      output: {
        certificateDetails
      }
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false,
      message: e.message
    }
  }
}
//------------------------------------
async function getActiveCertificateVersion(environmentId, identifier) {
  const filter = { environment: environmentId, identifier };

  try {
    const certificate = await this.findOne(filter, { activeVersion: 1 })
      .exec();
    if (certificate == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        version: certificate.activeVersion
      }
    }
  } catch (e) {
    console.error('error:', e.message);
    return {
      success: false,
      message: e.message
    }
  }
}


//----------------------------------------------------


module.exports = mongoose.model(modelName, sslTlsCertificateSchema);