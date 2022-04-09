const constants     = require('../../shared/constants');
const JenkinsHelper = require('../../infrastructure-worker/aws/ci/jenkinsHelper');

const ciHelpers             = [new JenkinsHelper()];

class CIHandler {
    canHandle = (topic) => {
        return topic === constants.topics.handleCI;
    }
    
    /**
     * jobDetails: The information required to handle the job. The schema of the object is: 
     * {
     *  accountId: 'string',
     *  details: 'Object', => contains CI name and CI provider, infrastructure, and configuration
     *  extras: 'Object'
     * }
     */
    handle = async (jobDetails) => {
        await ciHelpers.find(cih => cih.canHandle(jobDetails.details.name, jobDetails.details.provider)).handle(jobDetails.details, jobDetails.extras, jobDetails.accountId);
    }
}

module.exports = CIHandler;