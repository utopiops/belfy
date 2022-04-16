const constants = require('../../utils/constants');
const { Integration } = require('../../db/models/integration');
const HttpService = require('../../utils/http');
const HttpConfig = require('../../utils/http/http-config');
const config = require('../../utils/config').config;
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');
const ManagedApplicationService = require('../../db/models/application/application.service');
const { getInternalToken } = require('../../services/auth');
const CryptoJS = require('crypto-js');

exports.receiveGithubWebhook = receiveGithubWebhook;
exports.receiveGitlabWebhook = receiveGitlabWebhook;

async function receiveGithubWebhook(req, res) {

  var hash = CryptoJS.HmacSHA256(JSON.stringify(req.body), config.githubWebhookSecret);
  var hashInHex = "sha256=" + CryptoJS.enc.Hex.stringify(hash);
  if (hashInHex != req.get('X-Hub-Signature-256')) {
    return res.sendStatus(constants.statusCodes.notAuthorized);
  }
  console.log('x-github-event', req.get('x-github-event'));
  console.log('body', req.body);

  const internalToken = await getInternalToken();

  const httpConfig = new HttpConfig().withBearerAuthToken(internalToken);
  const http = new HttpService();

  if (req.get('x-github-event') == "push") {
    const htmlUrl = req.body.repository.html_url;
    const cloneUrl = req.body.repository.clone_url;
    const sshUrl = req.body.repository.ssh_url;
    const ref = req.body.ref;
    const utopiopsAppsResult = await UtopiopsApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (utopiopsAppsResult.success) {
      for (let outputs of utopiopsAppsResult.outputs) {
        var { name, jobName, repositoryUrl, branch, accountId } = outputs;

        if (branch == undefined || !ref.includes(branch)) {
          continue;
        }

        // Check account build access
        const buildAccess = await checkBuildAccess(accountId);
        if (!buildAccess) {
          continue;
        }

        // Try to trigger a job (when an error occurred trying to trigger another job)
        try {
          const params = {
            jobName,
          };
          await http.post(`${config.ciHelperUrl}/job/build`, params, httpConfig);
          
          await sleep(3000);
        } catch(error) {
          console.error('error', 'can not trigger ci job with name: ' + jobName);
        }

      }
    }
    const managedAppsResult = await ManagedApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (managedAppsResult.success) {
      for (let outputs of managedAppsResult.outputs) {
        var { id, jobName, repositoryUrl, deployedVersion, accountId, isDynamicApplication, dynamicNames, stateCode } = outputs;
        if (['destroyed', 'destroy_failed', 'created'].includes(stateCode)) {
          continue;
        }
        const appVersionResult = await ManagedApplicationService.getApplicaitonVersionBranch(id, deployedVersion);
        if (!appVersionResult.success) {
          continue;
        }
        var branch = appVersionResult.outputs.branch;
        if (isDynamicApplication) {
          const dynamicName = ref.replace(/^refs\/heads\//, '');
          const index = dynamicNames.findIndex(dn => dn.name == dynamicName);
          if (index != -1) {
            branch = dynamicName;
            jobName = dynamicNames[index].jobName;
          }
        }

        if (branch == undefined || !ref.includes(branch)) {
          continue;
        }

        // Check account build access
        const buildAccess = await checkBuildAccess(accountId);
        if (!buildAccess) {
          continue;
        }

        // Try to trigger a job (when an error occurred trying to trigger another job)
        try {
          const params = {
            jobName,
          };
          await http.post(`${config.ciHelperUrl}/job/build`, params, httpConfig);
          
          await sleep(3000);
        } catch(error) {
          console.error('error', 'can not trigger ci job with name: ' + jobName);
        }

      }
    }
  }
  //-------------------------------------------
  if (req.get('x-github-event') == "create") {
    const htmlUrl = req.body.repository.html_url;
    const cloneUrl = req.body.repository.clone_url;
    const sshUrl = req.body.repository.ssh_url;
    const ref = req.body.ref;
    const ref_type = req.body.ref_type;

    if (ref_type != "branch") {
      res.sendStatus(constants.statusCodes.ok);
      return
    }

    const managedAppsResult = await ManagedApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (managedAppsResult.success) {
      for (let outputs of managedAppsResult.outputs) {
        var { id, jobName, repositoryUrl, deployedVersion, accountId, userId, isDynamicApplication, dynamicNames, applicationName, environmentName, stateCode } = outputs;
        if (['destroyed', 'destroy_failed', 'created'].includes(stateCode)) {
          continue;
        }
        const appVersionResult = await ManagedApplicationService.getApplicaitonVersionBranch(id, deployedVersion);
        if (!appVersionResult.success) {
          continue;
        }

        if (!isDynamicApplication) { // Only trigger when branch is created
          continue;
        }
        const dynamicName = ref.replace(/^refs\/heads\//, '');
        const index = dynamicNames.findIndex(dn => dn.name == dynamicName);
        if (index != -1) { // Only create new dynamic application when it's not created before
          continue;
        }

        // Check account build access
        const buildAccess = await checkBuildAccess(accountId);
        if (!buildAccess) {
          continue;
        }

        // Create and deploy dynamic application
        try {    
          const token = await getInternalToken();
          const url = `${config.dmbqUrl}/dynamic-application/setup`;
          const body = {
            dynamicName,
            applicationName,
            environmentName,
            accountId,
            userId
          }
          const reqConfig = {
            headers: {
              authorization: `Bearer ${token}`
            }
          }
          
          const http = new HttpService();
          const res = await http.post(url, body, reqConfig);
          console.log('dynamic application creation job: ', res);
        } catch(error) {
          console.error('Error in dynamic application creation: ' + error);
        }
      }
    }
  }

  if (req.get('x-github-event') == "delete") {
    const htmlUrl = req.body.repository.html_url;
    const cloneUrl = req.body.repository.clone_url;
    const sshUrl = req.body.repository.ssh_url;
    const ref = req.body.ref;
    const ref_type = req.body.ref_type;

    if (ref_type != "branch") {
      res.sendStatus(constants.statusCodes.ok);
      return
    }

    const managedAppsResult = await ManagedApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (managedAppsResult.success) {
      for (let outputs of managedAppsResult.outputs) {
        var { id, jobName, repositoryUrl, deployedVersion, accountId, userId, isDynamicApplication, dynamicNames, applicationName, environmentName } = outputs;
        const appVersionResult = await ManagedApplicationService.getApplicaitonVersionBranch(id, deployedVersion);
        if (!appVersionResult.success) {
          continue;
        }

        if (!isDynamicApplication) { // Only trigger when branch is created
          continue;
        }
        const dynamicName = ref.replace(/^refs\/heads\//, '');
        console.log('dynamicName', dynamicName);
        const index = dynamicNames.findIndex(dn => dn.name == dynamicName);
        if (index == -1) { // Only delete a dynamic application when it had been created before
          continue;
        }

        // Create and deploy dynamic application
        try {    
          const token = await getInternalToken();
          const url = `${config.dmbqUrl}/dynamic-application/remove`;
          const body = {
            dynamicName,
            applicationName,
            environmentName,
            accountId,
            userId
          }
          const reqConfig = {
            headers: {
              authorization: `Bearer ${token}`
            }
          }
          console.log('body', body);
          const http = new HttpService();
          const res = await http.post(url, body, reqConfig);
          console.log('dynamic application deletion job: ', res);
        } catch(error) {
          console.error('Error in dynamic application deletion: ' + error);
        }
      }
    }
  }
  res.sendStatus(constants.statusCodes.ok);
}
//------------------------------------------------------------------
async function receiveGitlabWebhook(req, res) {

  if (config.gitlabWebhookSecret != req.get('X-Gitlab-Token')) {
    return res.sendStatus(constants.statusCodes.notAuthorized);
  }
  console.log('X-Gitlab-Event', req.get('X-Gitlab-Event'));
  console.log('body', req.body);


  const internalToken = await getInternalToken();

  const httpConfig = new HttpConfig().withBearerAuthToken(internalToken);
  const http = new HttpService();


  if (req.get('X-Gitlab-Event') == "Push Hook") {
    const htmlUrl = req.body.repository.homepage;
    const cloneUrl = req.body.repository.git_http_url;
    const sshUrl = req.body.repository.git_ssh_url;
    const ref = req.body.ref;
    const utopiopsAppsResult = await UtopiopsApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (utopiopsAppsResult.success) {
      for (let outputs of utopiopsAppsResult.outputs) {
        var { name, jobName, repositoryUrl, branch, accountId } = outputs;

        if (branch == undefined || !ref.includes(branch)) {
          continue;
        }

        // Check account build access
        const buildAccess = await checkBuildAccess(accountId);
        if (!buildAccess) {
          continue;
        }

        // Try to trigger a job (when an error occurred trying to trigger another job)
        try {
          const params = {
            jobName,
          };
          await http.post(`${config.ciHelperUrl}/job/build`, params, httpConfig);
          
          await sleep(3000);
        } catch(error) {
          console.error('error', 'can not trigger ci job with name: ' + jobName);
        }

      }
    }
    const managedAppsResult = await ManagedApplicationService.listApplicationsByRepoUrl(htmlUrl, cloneUrl, sshUrl);
    if (managedAppsResult.success) {
      for (let outputs of managedAppsResult.outputs) {
        var { id, jobName, repositoryUrl, deployedVersion, accountId, userId, isDynamicApplication, dynamicNames, applicationName, environmentName, stateCode } = outputs;
        if (['destroyed', 'destroy_failed', 'created'].includes(stateCode)) {
          continue;
        }
        const appVersionResult = await ManagedApplicationService.getApplicaitonVersionBranch(id, deployedVersion);
        if (!appVersionResult.success) {
          continue;
        }
        var branch = appVersionResult.outputs.branch;

        if (isDynamicApplication) {
          const dynamicName = ref.replace(/^refs\/heads\//, '');
          const index = dynamicNames.findIndex(dn => dn.name == dynamicName);
          if (req.body.before == '0000000000000000000000000000000000000000') { // Only trigger when branch is created
            if (index == -1) {
              // Check account build access
              const buildAccess = await checkBuildAccess(accountId);
              if (!buildAccess) {
                continue;
              }
              // Create and deploy dynamic application
              try {    
                const token = await getInternalToken();
                const url = `${config.dmbqUrl}/dynamic-application/setup`;
                const body = {
                  dynamicName,
                  applicationName,
                  environmentName,
                  accountId,
                  userId
                }
                const reqConfig = {
                  headers: {
                    authorization: `Bearer ${token}`
                  }
                }
                console.log('body', body);
                const http = new HttpService();
                const res = await http.post(url, body, reqConfig);
                console.log('dynamic application creation job: ', res);
              } catch(error) {
                console.error('Error in dynamic application creation: ' + error);
              }
              continue;
            }
          } else if (req.body.after == '0000000000000000000000000000000000000000') {
            if (index != -1) {
              // Create and deploy dynamic application
              try {    
                const token = await getInternalToken();
                const url = `${config.dmbqUrl}/dynamic-application/remove`;
                const body = {
                  dynamicName,
                  applicationName,
                  environmentName,
                  accountId,
                  userId
                }
                const reqConfig = {
                  headers: {
                    authorization: `Bearer ${token}`
                  }
                }
                console.log('body', body);
                const http = new HttpService();
                const res = await http.post(url, body, reqConfig);
                console.log('dynamic application deletion job: ', res);
              } catch(error) {
                console.error('Error in dynamic application deletion: ' + error);
              }
              continue;
            }
          } else { // Only trigger when branch is updated
            if (index != -1) {
              branch = dynamicName;
              jobName = dynamicNames[index].jobName;
            }
          }
        }

        if (branch == undefined || !ref.includes(branch)) {
          continue;
        }

        // Check account build access
        const buildAccess = await checkBuildAccess(accountId);
        if (!buildAccess) {
          continue;
        }

        // Try to trigger a job (when an error occurred trying to trigger another job)
        try {
          const params = {
            jobName,
          };
          await http.post(`${config.ciHelperUrl}/job/build`, params, httpConfig);
          
          await sleep(3000);
        } catch(error) {
          console.error('error', 'can not trigger ci job with name: ' + jobName);
        }

      }
    }
  }
  res.sendStatus(constants.statusCodes.ok);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkBuildAccess(accountId) {
  try {
    const token = await getInternalToken();
    const url = `${config.planManagerUrl}/user/access/build`;
    const body = {
      account_id: accountId,
    }
    const httpConfig = new HttpConfig().withBearerAuthToken(token);
    const http = new HttpService();
  
    const pmResponse = await http.post(url, body, httpConfig);
  
    return pmResponse.data.access;
  } catch(error) {
    console.error('Error in checkBuildAccess: ' + error);
    return false;
  }
}