const jenkinsService = require('../../db/models/jenkins/jenkins.service');
const { handleRequest } = require('../helpers');

async function saveBuildInfo(req, res) {
  const { environmentId, applicationName, duration, commit, author, email, result, startedAt } = req.body;

  const history = {
    duration: duration / 1000,
    commit,
    author,
    email,
    result,
    startedAt
  };

  const handle = async () => {
    return await jenkinsService.saveBuildInfo(environmentId, applicationName, history);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = saveBuildInfo;