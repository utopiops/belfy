const constants     = require('../../shared/constants');
const AwsAddSsl     = require('../../utility-worker/awsAddSsl');

const utilityHelpers= [new AwsAddSsl()];

class UtilityHandler {
    canHandle = (jobType, jobPath) => {
        return jobType === constants.topics.utility;
    }
    
    /**
     * jobDetails: The information required to handle the job. The schema of the object is: 
     * {
     *  accountId: 'string',
     *  details: 'Object', => contains the data required by the utility
     *  extras: 'Object' => must include utilityId
     * }
     */
    handle = async (jobDetails, jobPath) => {
        await utilityHelpers.find(uh => uh.canHandle(jobDetails.extras.utilityId)).handle(jobDetails.details, jobDetails.extras, jobDetails.accountId);
    }
}

module.exports = UtilityHandler;