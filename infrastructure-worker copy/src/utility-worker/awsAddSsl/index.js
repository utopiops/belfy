const constants       = require('../../shared/constants');
const terraformHelper = require('../../shared/terraform-helper');

class AwsAddSsl {

  provider = constants.cloudProviders.aws;

  canHandle = (utilityId) => utilityId === constants.utilityIds.awsAddSsl;
  handle = (details, extras, accountId) => {
    const region = details.region;
    const variableValues = [
      {
        variable: 'hosted_zone',
        value: details.hostedZone
      },
      {
        variable: 'domain_name',
        value: details.domainName
      }
    ]
      
    terraformHelper.executeUtility(this.provider, constants.utilityIds.awsAddSsl, accountId, variableValues, region, constants.utilityIds.awsAddSsl);
  }
}

module.exports = AwsAddSsl;