const configHandler = require('../../utils/config/index');
const config = new configHandler();

const HttpService = require('../../utils/http/index');
const http = new HttpService();

const HttpConfig = require('../../utils/http/http-config');
const VaultService = require('../../utils/auth/vaultService.js');
const vault = new VaultService();
const tokenService = require('../../utils/auth/tokenService');
const Jenkins = require('../../db/models/jenkins');
const User = require('../../db/models/user.js');
const ObjectId = require('mongoose').Types.ObjectId;


exports.saveJenkins = async (req, res, next) => {
    const userId = tokenService.getUserIdFromToken(req);
    const dto = req.body;
    dto.userId = userId;
    const jenkins = new Jenkins(dto);
    try {
        await jenkins.save();
        res.sendStatus(200);
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}

exports.getAll = async (req, res, next) => {

    try {
        const userId = tokenService.getUserIdFromToken(req);
        // Get all the jenkins instances (Managed and Unmanaged) of the user
        const jenkins = await Jenkins.find({userId: new ObjectId(userId)}).exec();
        res.send({
            data: jenkins
        })
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.status(500).send('Fetching Jenkins instances failed');
    }
}

exports.getAllViews = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);

    jenkinsDetails = await getJenkinsDetails(userId);

    if (!!!jenkinsDetails) {
        res.status(404).send();
        return;
    }


    const httpConfig = new HttpConfig().withBasicAuthToken(jenkinsDetails.token);

    const url = `${jenkinsDetails.url}/api/json?tree=views[name]`;
    http.get(url, httpConfig.config)
        .then(result => {
            res.send(result.data.views);
        })
        .catch(error => {
            res.status(error.response.status).send(error.message);
        });
}
exports.getView = async (req, res, next) => {
    const userId = tokenService.getUserIdFromToken(req);

    jenkinsDetails = await getJenkinsDetails(userId);

    if (!!!jenkinsDetails) {
        res.status(404).send();
        return;
    }

    const httpConfig = new HttpConfig().withBasicAuthToken(jenkinsDetails.token);


    const url = `${jenkinsDetails.url}/view/${req.params.name}/api/json?tree=jobs[displayName,url,allBuilds[timestamp,duration,result,url]]`;
    console.log(`url: ${url}`);
    http.get(url, httpConfig.config)
        .then(result => {
            res.send(result.data.jobs);
        })
        .catch(error => {
            res.status(error.response.status).send(error.message);
        });
}


exports.getAllJobs = async (req, res, next) => {
    const authToken = await getJenkinsAuthToken();

    const httpConfig = new HttpConfig().withBasicAuthToken(authToken);


    const url = `${config.getIntegrationUrls().jenkinsMaster}api/json?tree=jobs[displayName,url,color,healthReport[iconUrl,score]]`;
    console.log(`url: ${url}`);
    http.get(url, httpConfig.config)
        .then(result => {
            res.send(result.data.jobs);
        })
        .catch(error => {
            res.status(error.response.status).send(error.message);
        })
}

exports.setConfigs = async (req, res, next) => {
    const userId = tokenService.getUserIdFromToken(req);
    var user = new User();
    user.setJenkinsConfig(userId, req.body,
        res.send('ok'));

}




// function getJenkinsAuthToken() {
//     const tokenString = `jenkins-admin8126:${config.getJenkinsToken()}`;
//     return Buffer.from(tokenString).toString('base64');
// }


async function getJenkinsDetails(id) {
    var result = {};
    result.url = await config.getJenkinsUrl(id);
    if (!!!result.url) {
        return null;
    }
    var token = await config.getJenkinsCredentials(id);
    if (!!!token) { // todo: log the error (error has happend)
        return null;
    }
    result.token = Buffer.from(token).toString('base64');
    return result;
}