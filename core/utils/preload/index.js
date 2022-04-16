const configHandler = require('../config/index');
const config = new configHandler();

class PreloadHandler {

    constructor() {
        // Empty
    }

    prepare() {
        getIntegrationUrls();
    }


}

module.exports = PreloadHandler;

var hasFetchedIntegrationUrls = false;

// Private functions

function getIntegrationUrls(forced = false) {
    if (this.forced || !hasFetchedIntegrationUrls) {
        // Fetch from the origin
        const result = fetchIntegrationUrls();
        config.setIntegrationUrls(result);
        hasFetchedIntegrationUrls = true;

        return result;
    } else {
        // Return the existing object
        var urls = config.getIntegrationUrls();
        if (urls['jira'] == null) { // For some reason the file is modified! TODO: now what?
        }
        return urls;
    }
}


function fetchIntegrationUrls() {
    // TODO: Actual implementation required...
    var result = { // The fetched object
        jira: 'https://aisleplus.atlassian.net/',
        jenkinsMaster: 'http://jenkins.aisleplusdns.com/',
        gitRepo: '' // TODO: How to connect repo(s) to jira?
    };
    return result;
}