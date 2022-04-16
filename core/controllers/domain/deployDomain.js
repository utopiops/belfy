const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const constants = require('../../utils/constants');
const dnsPromises = require('dns').promises;

async function deployDomain(req, res) {
  const handle = async () => {
    const { userId, accountId } = res.locals;
    const { domainName } = req.params;
    const { createCertificate } = req.body;
    const jobPath = constants.jobPaths.deployDomain;

    if (createCertificate) {
      try {
        const domain_ns_records = await dnsPromises.resolveNs(domainName);
        const resources = await domainService.getDomainResources(accountId, domainName, '[ns]');
        const our_ns_records = resources.outputs;
        domain_ns_records.sort();
        our_ns_records.sort();
        const compare =
          domain_ns_records.length === our_ns_records.length &&
          domain_ns_records.every((value, index) => value === our_ns_records[index]);
        if (!compare) throw new Error();
      } catch (error) {
        return {
          success: false,
          error: {
            message: 'ns-records are not set for this domain.',
            statusCode: constants.statusCodes.badRequest,
          },
        };
      }
      const result = await domainService.updateDomain(accountId, domainName);
      if (!result.success) {
        return result;
      }
    }

    return await domainService.tfActionDomain('deploy', userId, accountId, jobPath, domainName);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = deployDomain;
