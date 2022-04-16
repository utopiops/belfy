const { getEnvironmentIdAndProvider } = require('./helpers');
const constants = require("../../utils/constants");
const yup = require('yup');
const CertificateModel = require('../../db/models/ssl_tls_certificate/ssl_tls_certificate');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const AwsEnvironmentModel = require('../../db/models/environment_application/awsEnvironment');
const tokenService = require('../../utils/auth/tokenService');
const queueService = require('../../queue');
const { config } = require('../../utils/config');

yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});


const sslTlsController = {
  list: list,
  listVersions: listVersions,
  deleteCertificate: deleteCertificate,
  certificateDetails: certificateDetails,
  listEnvironment: listEnvironment,
  createCertificate: createCertificate,
  activateCertificate: activateCertificate,
  deployCertificate: deployCertificate,
  destroyCertificate: destroyCertificate,
  setState: setState,
};


//-------------------------
async function list(req, res) {

  const accountId = tokenService.getAccountIdFromToken(req);
  const environmentName = req.params.environmentName; // This can be null as two routes are handled here
  let environmentIds = [];
  try {
    let result = await EnvironmentModel.listEnvironmentIdsByAccount(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.duplicate);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      environmentIds = result.output.environmentIds.map(e => e.id);
      if (!environmentIds.length) { // User doesn't have any environments, so no need to search for the environment databases
        res.send([]);
        return;
      }
    }
  } catch (error) {
    console.error(`error:`, error.message);
    res.sendStatus(constants.statusCodes.ise);
  }

  try {
    const result = await CertificateModel.listCertificate(environmentIds);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);  // No reason to fail, this is an internal issue
    } else {
      res.status(constants.statusCodes.ok).send(result.output.certificates);
    }
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }
}
//-------------------------
async function listVersions(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { environmentName, certificateIdentifier } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    const result = await CertificateModel.listCertificateVersions(environmentId, certificateIdentifier);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);  // No reason to fail, this is an internal issue
    } else {
      res.status(constants.statusCodes.ok).send(result.output.versions);
    }
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }
}
//-------------------------
async function deleteCertificate(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { environmentName, certificateIdentifier } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    const result = await CertificateModel.deleteCertificate(environmentId, certificateIdentifier);
    if (!result.success) {
      res.status(constants.statusCodes.badRequest).send({ message: 'Certificate not found or cannot be deleted' });
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }
}
//-------------------------
async function certificateDetails(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { environmentName, certificateIdentifier, version } = req.params;
  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    const result = await CertificateModel.getCertificate(environmentId, certificateIdentifier, version);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);  // No reason to fail, this is an internal issue
    } else {
      res.status(constants.statusCodes.ok).send(result.output.certificateDetails);
    }
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }
}
//-------------------------
async function activateCertificate(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { environmentName, certificateIdentifier, version } = req.params;
  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    const result = await CertificateModel.activate(environmentId, certificateIdentifier, version);
    if (!result.success) {
      if (result.message === 'certificate not found') {
        res.status(constants.statusCodes.badRequest).send({ message: result.message });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    console.error('error:', e.message);
    res.status(constants.statusCodes.ise);
  }
}
//-------------------------
// Gives the list of environments to which a SSL/TLS certificate can be added, consider that we only support AWS ACM at the moment
async function listEnvironment(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  try {
    // We just support aws at the moment
    let result = await AwsEnvironmentModel.listEnvironmentsWithHostedZone(accountId);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.status(constants.statusCodes.ok).send(result.output.environments)
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}
//-----------------------------
async function createCertificate(req, res) {
  const environmentName = req.params.environmentName;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);


  const isFirstVersion = req.params.certificateIdentifier ? false : true;
  const isUpdate = req.method === 'PUT' ? true : false;
  const version = req.params.version;
  const certificateIdentifier = req.params.certificateIdentifier;


  const validationSchema = yup.object().shape({
    domainName: yup.string()
      .required("Please fill out this field")
      .test(
        "should-match-regex",
        "Only * or a combination of alphanumeric characters and the characters - and _ are allowed",
        function (value) {
          return /^([a-zA-Z0-9\-_]+|\*)$/g.test(value);
        }
      ),
    subjectAlternativeNames: yup.array()
      .of(
        yup.object().shape({
          name: yup.string()
            .required("Variable name is required")
            .test(
              "should-match-regex",
              "Only * or a combination of alphanumeric characters and the characters - and _ are allowed",
              function (value) {
                return /^([a-zA-Z0-9\-_]+|\*)$/g.test(value);
              }
            ),
        })
      )
      .unique("Duplicate key", (a) => a.key),
  });

  let dto;
  try {
    dto = validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {

    // Note: we don't update the domain name, only SANs
    let certificate = { subjectAlternativeNames: dto.subjectAlternativeNames.map(san => san.name) };

    if (!isFirstVersion) {
      certificate.identifier = certificateIdentifier;
    } else {
      certificate.domainName = dto.domainName;
    }

    const result = isFirstVersion ? await CertificateModel.createCertificate(environmentId, userId, certificate) :
      isUpdate ? await CertificateModel.updateCertificateVersion(environmentId, userId, certificate, version) :
        await CertificateModel.addCreateCertificate(environmentId, userId, certificate, version);
    if (!result.success) {
      res.status(constants.statusCodes.badRequest).send({ message: result.message });
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    console.error('error:', e.message);
    res.status(constants.statusCodes.ise);
  }

}


async function deployCertificate(req, res) {
  await tfActionCertificate('deploy', req, res);
}
async function destroyCertificate(req, res) {
  await tfActionCertificate('destroy', req, res);
}

async function tfActionCertificate(action, req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { environmentName, certificateIdentifier } = req.params;

  const validationSchema = yup.object().shape({
    accessKeyId: yup.string(), // still not sure what to do with these
    secretAccessKey: yup.string(),
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { accessKeyId, secretAccessKey } = req.body;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;

  const jobPaths = {
    deploy: constants.jobPaths.deployACMCertificate,
    destroy: constants.jobPaths.destroyACMCertificate,
  };

  const jobPath = jobPaths[action];
  let activeVersion;
  try {
    const result = await CertificateModel.getActiveCertificateVersion(environmentId, certificateIdentifier);
    if (!result.success) {
      if (result.message === constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.badRequest).send({ message: 'No active version found' });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
    activeVersion = result.output.version;
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }

  let certificate;
  try {
    const result = await CertificateModel.getCertificate(environmentId, certificateIdentifier, activeVersion);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);  // No reason to fail, this is an internal issue
    } else {
      certificate = result.output.certificateDetails;
    }
  } catch (e) {
    res.status(constants.statusCodes.ise);
  }


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
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      }
    }
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      identifier: certificateIdentifier,
      version: activeVersion,
    }
  };
  try {
    const jobId = await queueService.sendMessage(config.queueName, message, options);
    if (action === 'deploy' || action === 'destroy') {
      const state = {
        code: action === 'deploy' ? 'deploying' : 'destroying',
        job: jobId
      }
      await CertificateModel.setState(environmentId, certificateIdentifier, state);
    }
    res.send(jobId);
  } catch (error) {
    console.log(`error: ${error.message}`);
    res.status(constants.statusCodes.ise).send('Failed to schedule the job!');
  }
}
//-------------------------
async function setState(req, res) {
  console.log(`hereeeeeeeee`);
  const accountId = tokenService.getAccountIdFromToken(req);
  const { environmentName, certificateIdentifier } = req.params;
  // Check if the environment exist and get its id

  const validationSchema = yup.object().shape({
    code: yup.string().oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed']).required(),
    job: yup.string().required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const state = req.body;

  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    const result = await CertificateModel.setState(environmentId, certificateIdentifier, state);
    if (!result.success) {
      if (result.message === 'certificate not found') {
        res.status(constants.statusCodes.badRequest).send({ message: result.message });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    console.error('error:', e.message);
    res.status(constants.statusCodes.ise);
  }
}

module.exports = sslTlsController;