const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const awsApiVersions = require('../../../utils/awsApiVersions');
const constants = require("../../../utils/constants");
const sslTlsCertificateStates = require("./sslTlsCertificateStates");
const ssl_tls_certificate = require("./ssl_tls_certificate");
const EnvironmentModel = require('../environment/environment');
const ApplicationVersionModel = require('../application/applicationVersion');
const environmentService = require("../environment/environment.service");
const awsEnvironmentService = require("../environment/awsEnvironment.service");
const queueService = require("../../../queue");
const { config } = require("../../../utils/config");
const { runQueryHelper } = require("../helpers");
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job')
const job = new Job()

module.exports = {
  list,
  listVersions,
  deleteCertificate,
  getCertificateDetails,
  getCertificateSummary,
  listEnvironment,
  createCertificate,
  activateCertificate,
  deployCertificate,
  destroyCertificate,
  setState,
  getCertificateResources
};


//-----------------------------------Controller methods-------------------------------------------

async function list(accountId, environmentName) {
  let environmentIds = [];
  try {
    let result = await environmentService.listEnvironmentIdsByAccount(
      accountId,
      environmentName
    );
    if (!result.success) {
      return {
        success: false,
        message:
          result.message == constants.errorMessages.models.duplicate
            ? constants.statusCodes.duplicate
            : constants.statusCodes.ise,
      };
    }
    environmentIds = result.outputs.environmentIds.map((e) => e.id);
  } catch (error) {
    console.error(`error:`, error.message);
    return {
      success: false,
      message: constants.statusCodes.ise,
    };
  }

  const runQuery = async () => {
    const filter = { environment: { $in: environmentIds } };
    return await ssl_tls_certificate
      .find(filter, {
        identifier: 1,
        domainName: 1,
        status: 1,
        activeVersion: 1,
        state: 1,
      })
      .populate("environment", "name hostedZone domain")
      .exec();
  };

  const extractOutput = (result) => ({
    certificates: result.map((c) => ({
      ...c.toJSON(),
      environment: c.environment.name,
      domainName: `${c.domainName}.${(c.environment.domain && c.environment.domain.dns) ? c.environment.domain.dns : c.environment.hostedZone.name}`, // backwards compatibility
    })),
  });

  return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------
async function listVersions(environmentId, certificateIdentifier) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
    };
    return await ssl_tls_certificate
      .findOne(filter, {
        "versions.version": 1,
        "versions.fromVersion": 1,
        "versions.createdAt": 1,
      })
      .exec();
  };

  const extractOutput = (result) => ({
    ...result.toJSON(),
    versions: result.versions,
  });

  return await runQueryHelper(runQuery, extractOutput);
}
//-------------------------
async function deleteCertificate(environmentId, certificateIdentifier) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
      "state.code": {
        $nin: [
          sslTlsCertificateStates.deployed,
          sslTlsCertificateStates.deployFailed,
        ],
      },
    };
    return await ssl_tls_certificate.findOneAndDelete(filter).exec();
  };

  return await runQueryHelper(runQuery);
}
//-------------------------
async function getCertificateDetails(
  environmentId,
  certificateIdentifier,
  version
) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
      "versions.version": version,
    };
    return await ssl_tls_certificate
      .findOne(filter, {
        identifier: 1,
        name: 1,
        domainName: 1,
        status: 1,
        state: 1,
        activeVersion: 1,
        versions: 1,
      })
      .populate("environment", "name domain")
      .exec();
  };
  const extractOutput = ({ versions, environment, domainName, ...rest }) => ({
    certificateDetails: {
      ...(delete rest._doc.environment && delete rest._doc.versions && rest._doc),
      ...versions[version - 1]._doc,
      domainName: `${domainName}.${environment.domain.dns}`,
      hostedZoneName: environment.domain.dns,
    },
  });

  return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------------
async function getCertificateSummary(environmentId, certificateIdentifier) {
  const runQuery = async () => {
    const filter = { environment: environmentId, identifier: certificateIdentifier };
    return await ssl_tls_certificate.findOne(filter, { _id: 0, status: 1, state: 1, deployedVersion: 1, activeVersion: 1 }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//------------------------------------
async function activateCertificate(
  environmentId,
  certificateIdentifier,
  version
) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
      "versions.version": version,
    };
    const updated = {
      $set: {
        activeVersion: version,
        "versions.$.isActivated": true,
      },
    };

    return await ssl_tls_certificate
      .findOneAndUpdate(filter, updated, {
        new: true,
      })
      .exec();
  };

  return await runQueryHelper(runQuery);
}
//-------------------------
// Gives the list of environments to which a SSL/TLS certificate can be added, consider that we only support AWS ACM at the moment
async function listEnvironment(accountId) {
  try {
    // We just support aws at the moment
    let result = await awsEnvironmentService.listEnvironmentsWithHostedZone(
      accountId
    );
    if (!result.success) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound,
      };
    } else {
      return {
        success: true,
        outputs: result.outputs.environments,
      };
    }
  } catch (error) {
    console.error(error.message);
    return {
      success: false,
    };
  }
}
//-----------------------------
async function createCertificate(
  userId,
  environmentId,
  certificateIdentifier,
  version,
  isFirstVersion,
  isUpdate,
  domainName,
  subjectAlternativeNames,
  region,
) {
  try {
    // Note: we don't update the domain name, only SANs
    let certificate = {
      subjectAlternativeNames: subjectAlternativeNames.map((san) => san.name),
    };

    if (!isFirstVersion) {
      certificate.identifier = certificateIdentifier;
    } else {
      certificate.domainName = domainName;
    }

    const result = isFirstVersion
      ? await createCertificateProcess(environmentId, userId, certificate, region)
      : isUpdate
      ? await updateCertificateVersion(
          environmentId,
          userId,
          certificate,
          version
        )
      : await addCertificateVersion(
          environmentId,
          userId,
          certificate,
          version
        );
    return result;
  } catch (e) {
    console.error("error::", e);
    return {
      success: false,
    };
  }
}

async function deployCertificate(
  accountId,
  userId,
  environmentId,
  environmentName,
  provider,
  certificateIdentifier,
  accessKeyId,
  secretAccessKey,
  headers
) {
  const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
  if(!environment) {
    return {
      error: {
        statusCode: constants.statusCodes.notAllowed,
        message: 'The intended environment must be deployed to be able to deploy the certificate'
      }
    }
  }

  return await tfActionCertificate(
    "deploy",
    accountId,
    userId,
    environmentId,
    environmentName,
    provider,
    certificateIdentifier,
    accessKeyId,
    secretAccessKey,
    headers
  );
}
async function destroyCertificate(
  accountId,
  userId,
  environmentId,
  environmentName,
  provider,
  certificateIdentifier,
  accessKeyId,
  secretAccessKey,
  bucketName,
  region,
  headers
) {
  try {
    // Checking to make sure the certificate is not being used anywhere
    let arn = await getCertificateResources(environmentName, certificateIdentifier, { accessKeyId, secretAccessKey }, region, bucketName, "[certificate_arn]");
    arn = arn.outputs;
    console.log("arn::", arn);
    if(arn) {
      // Checking ecs apps
      const ecsVersions = await ApplicationVersionModel.find({ 
        kind: constants.applicationKinds.ecs,
        $or: [
          {
            certificate_arn: arn
          },
          {
            exposed_ports: { 
                $elemMatch: {
                certificate_arn: arn
              }
            }
          }
        ]
      })
      .populate('environmentApplication', 'name')
      .exec();
      const filteredEcsVersions = ecsVersions.filter(version => {
        return (version.environmentApplication.activeVersion == version.version || version.environmentApplication.deployedVersion == version.version)
      });
      // Checking s3 apps
      const s3Versions = await ApplicationVersionModel.find({ 
        kind: constants.applicationKinds.s3Website,
        $or: [
          {
            acm_certificate_arn: arn
          },
          {
            redirect_acm_certificate_arn: arn
          }
        ]
      })
      .populate('environmentApplication', 'name')
      .exec();
      const filteredS3Versions = s3Versions.filter(version => {
        return (version.environmentApplication.activeVersion == version.version || version.environmentApplication.deployedVersion == version.version)
      });
      // Checking aws environments
      const environments = await EnvironmentModel.find({
        accountId, 
        kind: 'aws',
        'versions.albList.listenerRules.certificateArn': arn
      }).exec()
      console.log('$$$$$$Environments: ' , environments)
      const filteredEnvironments = environments.filter(environment => {
        const activeVersion = environment.versions[environment.activeVersion - 1]
        const deployedVersion = environment.versions[environment.deployedVersion - 1]
        for(const alb of activeVersion.albList) {
          for(const rule of alb.listenerRules) {
            if(rule.certificateArn == arn) {
              return true
            }
          }
        }
        for(const alb of deployedVersion.albList) {
          for(const rule of alb.listenerRules) {
            if(rule.certificateArn == arn) {
              return true
            }
          }
        }
        
        return false
      })
      
      console.log('$$$$$$Filtered: ' , filteredEnvironments)
      let message;
      if(filteredEcsVersions.length > 0) {
        message = `The certificate is being used by the following ECS apps: ${filteredEcsVersions.map(app => app.environmentApplication.name).join(', ')}`;
      } else if(filteredS3Versions.length > 0) {
        message = `The certificate is being used by the following S3 apps: ${filteredS3Versions.map(app => app.environmentApplication.name).join(', ')}`;
      } else if(filteredEnvironments.length > 0) {
        message = `The certificate is being used by the following AWS environments: ${filteredEnvironments.map(env => env.name).join(', ')}`;
      }
      if(filteredEcsVersions.length > 0 || filteredS3Versions.length > 0 || filteredEnvironments.length > 0) {  
        return {
          error: {
            statusCode: constants.statusCodes.notAllowed,
            message
          }
        }
      }

      // Here, it's safe to destroy the certificate and we should corrupt the versions that use it and aren't active or deployed
      const createUpdates = (array) => {
        let result = {}
        array.forEach(item => {
          result[`versions[${item}].isCorrupted`] = true
        })
        return result
      }
      await ApplicationVersionModel.updateMany({ 
        kind: constants.applicationKinds.ecs,
        $or: [
          {
            certificate_arn: arn
          },
          {
            exposed_ports: { 
                $elemMatch: {
                certificate_arn: arn
              }
            }
          }
        ]
      }, { isCorrupted: true })
      
      await ApplicationVersionModel.updateMany({ 
        kind: constants.applicationKinds.s3Website,
        $or: [
          {
            acm_certificate_arn: arn
          },
          {
            redirect_acm_certificate_arn: arn
          }
        ]
      }, { isCorrupted: true })

      for(const environment of environments) {
        const { activeVersion, deployedVersion } = environment
        let indexes = []
        for(let i=0; i< environment.versions.length; i++) {
          let corrupt = false
          if(i == (activeVersion-1) || i == (deployedVersion-1)) {
            continue
          } 

          const version = environment.versions[i]
          for(const alb of version.albList) {
            for(const rule of alb.listenerRules) {
              if(rule.certificateArn == arn) {
                indexes.push(i)
                corrupt = true
                break
              }
            }
            if(corrupt) break
          }
        }
        for(const index of indexes) {
          await EnvironmentModel.findOneAndUpdate({ 
            _id: environment._id, 
            'versions.version': index+1 
          }, { $set: { 'versions.$.isCorrupted': true }}).exec()
        }
      }
    }

    return await tfActionCertificate(
      "destroy",
      accountId,
      userId,
      environmentId,
      environmentName,
      provider,
      certificateIdentifier,
      accessKeyId,
      secretAccessKey,
      headers
    );
  } catch(error) {
    console.log('Error in destroying certificate: ' , error);
    return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: error.message
      }
    };
  }
}
// --------------------------------------------------
async function tfActionCertificate(
  action,
  accountId,
  userId,
  environmentId,
  environmentName,
  provider,
  certificateIdentifier,
  accessKeyId,
  secretAccessKey,
  headers
) {
  const jobPaths = {
    deploy: constants.jobPaths.deployACMCertificateV2,
    destroy: constants.jobPaths.destroyACMCertificateV2,
  };
  // log
  const jobPath = jobPaths[action];

  // get active version
  // ==============================
  const runGetActiveVersionQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
    };

    return await ssl_tls_certificate
      .findOne(filter, { activeVersion: 1 })
      .exec();
  };

  const extractActiveVersionOutput = (result) => ({
    version: result.activeVersion,
  });

  let activeVersion = await runQueryHelper(
    runGetActiveVersionQuery,
    extractActiveVersionOutput
  );
  activeVersion = activeVersion.outputs.version;
  // ============================

  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
      "versions.version": activeVersion,
    };
    return await ssl_tls_certificate
      .findOne(filter, {
        identifier: 1,
        name: 1,
        domainName: 1,
        status: 1,
        activeVersion: 1,
        versions: 1,
        region: 1,
      })
      .populate("environment", "name hostedZone domain")
      .exec();
  };

  const extractOutput = (result) => ({
    certificate: result,
  });

  let response = await runQueryHelper(runQuery, extractOutput);
  if (!response.success) return response;
  certificate = response.outputs.certificate;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        identifier: certificateIdentifier,
        certificate,
        version: activeVersion,
        provider,
        region: certificate.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      },
    },
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      identifier: certificateIdentifier,
      version: activeVersion,
    },
  };
  try {
    const jobId = await queueService.sendMessage(
      config.queueName,
      message,
      options
    );

    const jobNotification = {
      accountId: message.jobDetails.accountId,
      category: "infw",
      dataBag: {
        jobPath: message.jobPath,
        environmentName,
        certificateIdentifier,
        status: 'created',
        jobId
      }
    }

    const httpConfig = new HttpConfig().withCustomHeaders(headers);
		await job.sendJobNotification(jobNotification, httpConfig.config);

    if (action === "deploy" || action === "destroy") {
      const state = {
        code: action === "deploy" ? "deploying" : "destroying",
        job: jobId,
      };
      await setStateProcess(environmentId, certificateIdentifier, state);
    }
		if (action === 'deploy') {
			await ssl_tls_certificate.findOneAndUpdate({ environment: environmentId, identifier: certificateIdentifier }, { deployedVersion: activeVersion });
		}
    return {
      success: true,
      outputs: { jobId }
    };
  } catch (error) {
    console.log(`error:: ${error.message}`);
    return {
      success: false,
      message: "Failed to schedule the job!",
    };
  }
}
//-------------------------
async function setState(environmentId, certificateIdentifier, state) {
  try {
    const result = await setStateProcess(
      environmentId,
      certificateIdentifier,
      state
    );
    return result;
  } catch (e) {
    console.error("error:", e.message);
    return {
      success: false,
    };
  }
}

//------------------------------------
async function setStateProcess(environmentId, certificateIdentifier, state) {
  const stateCode = state.code;
  let validCurrentState = [];
  switch (stateCode) {
    case "destroyed":
    case "destroy_failed":
      validCurrentState = ["destroying"];
      break;
    case "deployed":
    case "deploy_failed":
      validCurrentState = ["deploying"];
      break;
    case "destroying":
      validCurrentState = [null, "deployed", "destroy_failed", "deploy_failed"];
      break;
    case "deploying":
      validCurrentState = [
        null,
        "created",
        "destroyed",
        "destroy_failed",
        "deploy_failed",
        "deployed"
      ];
      break;
  }

  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier: certificateIdentifier,
      "state.code": { $in: validCurrentState },
    };
    return await ssl_tls_certificate
      .findOneAndUpdate(filter, { state }, { new: true })
      .exec();
  };

  const extractOutput = (result) => ({
    certificate: result,
  });

  let certificate = await runQueryHelper(runQuery, extractOutput);
  console.log('cert::', certificate);
  certificate = certificate.outputs;
  if (!certificate) {
    return {
      success: false,
      message: constants.errorMessages.models.elementNotFound,
    };
  }
  return {
    success: true,
  };
}
// ----------------------------------------
async function createCertificateProcess(
  environmentId,
  userId,
  { domainName, subjectAlternativeNames },
  region,
) {
  const certificate = new ssl_tls_certificate({
    environment: environmentId,
    domainName: domainName,
    region,
    versions: [
      {
        subjectAlternativeNames,
        createdBy: userId,
      },
    ],
  });
  try {
    await certificate.save();
    return {
      success: true,
    };
  } catch (e) {
    console.error("error:", e.message);
    return {
      success: false,
    };
  }
}
//------------------------------------
async function addCertificateVersion(
  environmentId,
  userId,
  { subjectAlternativeNames, identifier },
  version
) {
  // Find the biggest version for this environment application
  const runQueryMax = async () => {
    const maxFilter = {
      identifier,
    };
    return await ssl_tls_certificate.findOne(maxFilter, { versions: 1 }).exec();
  };
  const extractOutputMax = (result) => ({
    certificate: result,
  });

  let max = await runQueryHelper(runQueryMax, extractOutputMax);
  console.log('max::', max);
  max = max.outputs.certificate;
  if (max == null) {
    return {
      success: false,
      message: "Certificate not found",
    };
  }

  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier,
      "versions.version": version,
    };
    const updated = {
      $push: {
        versions: {
          version: max.versions.length + 1,
          fromVersion: version,
          subjectAlternativeNames,
          createdBy: userId,
        },
      },
    };
    return await ssl_tls_certificate
      .findOneAndUpdate(filter, updated, {
        new: true,
      })
      .exec();
  };
  const extractOutput = (result) => ({
    certificate: result,
  });

  let response = await runQueryHelper(runQuery, extractOutput);
  if (!response.success) return response;
  certificate = response.outputs.certificate;

  if (certificate == null) {
    return {
      success: false,
      message: "Certificate not found",
    };
  } else {
    return {
      success: true,
    };
  }
}
//------------------------------------
async function updateCertificateVersion(
  environmentId,
  userId,
  { subjectAlternativeNames, identifier },
  version
) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      identifier,
      "versions.version": version,
      activeVersion: { $ne: version },
    };
    const updated = {
      $set: {
        "versions.$.subjectAlternativeNames": subjectAlternativeNames,
      },
    };
    return await ssl_tls_certificate
      .findOneAndUpdate(filter, updated, {
        new: true,
      })
      .exec();
  };
  const extractOutput = (result) => ({
    certificate: result,
  });

  let response = await runQueryHelper(runQuery, extractOutput);
  if (!response.success) return response;
  certificate = response.outputs.certificate;
  if (certificate == null) {
    return {
      success: false,
      message: "Certificate not found",
    };
  } else {
    return {
      success: true,
    };
  }
}
//------------------------------------------------
async function getCertificateResources(environmentName, identifier, credentials, region, bucketName, fields) {
	AWS.config.update({
		region: region,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey
	});
	const s3 = new AWS.S3({
		apiVersion: awsApiVersions.s3
	});
	try {
		const params = {
			Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker
			Key: `utopiops-water/certificates/environment/${environmentName}/${identifier}`
		};
    console.log('params::', params);
		const resp = await s3.getObject(params).promise();
		const state = JSON.parse(resp.Body.toString());
    
		if (fields === '[*]') {
			return {
				success: true,
				outputs: state
			};
		}
		else if (fields === '[certificate_arn]') {
			return {
				success: true,
				outputs: state.outputs.certificate_arn.value
			}
		}
		return {
			success: true,
			outputs: state.outputs
		};
	} catch (err) {
		console.log(`error: ${err.message} - ${err.code}`);
		if (err.code === 'NoSuchKey') {
			return {
        error: {
          statusCode: constants.statusCodes.notFound,
          message: constants.errorMessages.models.elementNotFound
        }
      }
		}
		return {
      error: {
        statusCode: constants.statusCodes.ise,
        message: 'Something went wrong'
      }
    }
	}
}