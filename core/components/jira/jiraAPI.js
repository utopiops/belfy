const configHandler = require('../../utils/config/index');
const config = new configHandler();

const HttpService = require('../../utils/http/index');
const http = new HttpService();

const HttpConfig = require('../../utils/http/http-config');
const tokenService = require('../../utils/auth/tokenService');

const User = require('../../db/models/user');


exports.getAllIssues = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);
    jiraConfig = await getJiraConfig(userId);
    if (!!!jiraConfig) {
        res.status(404).send();
        return;
    }

    const httpConfig = new HttpConfig().withBasicAuthToken(jiraConfig.token);
    const url = `${jiraConfig.url}/rest/agile/latest/board/${req.params.id}/issue`;
    http.get(url, httpConfig.config)
        .then(result => {
            res.send(result.data);
        })
        .catch(error => {
            res.status(error.response.status).send(error.message);
        })
}

exports.getAllBoards = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);
    jiraConfig = await getJiraConfig(userId);
    console.log(`jc: ${JSON.stringify(jiraConfig)}`);

    if (!!!jiraConfig) {
        res.status(404).send();
        return;
    }

    const httpConfig = new HttpConfig().withBasicAuthToken(jiraConfig.token);
    const url = `${jiraConfig.url}/rest/agile/latest/board`;
    http.get(url, httpConfig.config)
        .then(result => {
            res.send(result.data);
        })
        .catch(error => {
            res.status(error.response.status).send(error.message);
        })
}

exports.setConfig = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);
    var user = new User();
    user.setJiraConfig(userId, req.body,
        res.send('ok'));
}

async function getJiraConfig(id) {

    const jiraConfig = await config.getJiraConfig(id);
    if (!jiraConfig || !jiraConfig.url || !jiraConfig.credentials) {
        return null;
    }

    const tokenString = `${jiraConfig.credentials.username}:${jiraConfig.credentials.password}`;
    return {
        url: jiraConfig.url,
        token: Buffer.from(tokenString).toString('base64')
    };
}