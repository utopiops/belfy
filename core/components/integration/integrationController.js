const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const { Integration } = require('../../db/models/integration');
const yup = require('yup');
const FormData = require('form-data');
const HttpService = require('../../utils/http');
const config = require('../../utils/config').config;


exports.getIntegrationsList = getIntegrationsList;
exports.get = get;
exports.listIntegrationsByAccountId = listIntegrationsByAccountId;
exports.add = add;
exports.update = update;
exports.deleteIntegration = deleteIntegration;
exports.githubCallbacks = githubCallbacks;
exports.gitlabCallbacks = gitlabCallbacks;
exports.bitbucketCallbacks = bitbucketCallbacks;

//---------------------------------------------
async function getIntegrationsList(req, res) {
  const accountId = res.locals.accountId;
  const result = await Integration.listIntegrations(accountId);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    const filteredIntegrations = result.output.integrations.filter(integration => {
      return !['default_github', 'default_gitlab', 'default_bitbucket'].includes(integration.name);
    });
    res.send(filteredIntegrations);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
//---------------------------------------------
async function listIntegrationsByAccountId(req, res) {
  const accountId = req.params.accountId;
  const services = req.query.services;
  const isDefault = req.query.isDefault;
  const result = await Integration.listIntegrationsByAccountId(accountId, isDefault, services);
  // TODO: Check the role of the user (roles).

  if (result.success) {
    res.send(result.output.integrations);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
//------------------------------------------------
async function get(req, res) {
  let accountId;
  if (res.locals.internal) {
    accountId = req.params.accountId;
  } else {
    accountId = res.locals.accountId;
  }
  if (!accountId) return res.sendStatus(constants.statusCodes.badRequest);

  const name = req.params.name;
  const result = await Integration.get(accountId, name);
  if (result.success) {
    res.send(result.output.integration);
  } else {
    if (result.message === constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.notFound);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
//------------------------------------------------
async function add(req, res) {

  // Schema validation
  const validationSchema = yup.object().shape({
    service: yup.string().required(""),
    name: yup.string().required(""),
    token: yup.string().required(""),
    url: yup.string()
      .url()
      .when('service', {
        is: v => ['gitlab', 'sentry', 'email', 'github', 'bit_bucket'].includes(v),
        then: yup.string().url().required(),
      }),
    isDefault: yup.boolean()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const accountId = res.locals.accountId;

  const { name, url, token: tokenName, service, isDefault } = req.body;

  const integration = {
    name,
    url,
    tokenName,
    service,
    isDefault
  };

  const result = await Integration.add(accountId, integration);
  if (!result.success) {
    if (result.message == constants.errorMessages.models.duplicate) {
      res.sendStatus(constants.statusCodes.duplicate);
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  } else {
    res.sendStatus(constants.statusCodes.ok);
  }
}
//------------------------------------------------
async function update(req, res) {
  // Note: you cannot change the service

  // Schema validation
  const validationSchema = yup.object().shape({
    token: yup.string().required("Please fill out this field"),
    url: yup.string()
      .url("Not a valid URL")
      .required("Please fill out this field"),
    isDefault: yup.boolean().required()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const accountId = res.locals.accountId;

  const { url, token: tokenName, isDefault } = req.body;

  const name = req.params.name;
  const integration = {
    url,
    tokenName,
    isDefault
  };

  const result = await Integration.update(accountId, name, integration);
  if (!result.success) {
    if (result.message == constants.errorMessages.models.duplicate) {
      res.sendStatus(constants.statusCodes.duplicate);
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  } else {
    res.sendStatus(constants.statusCodes.ok);
  }
}
//------------------------------------------------
async function deleteIntegration(req, res) {
  const accountId = res.locals.accountId;
  const name = req.params.name;

  const result = await Integration.deleteIntegration(accountId, name);

  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
//------------------------------------------------
async function githubCallbacks(req, res) {
  const portalUrl = config.portalUrl + '/fully-managed/apps/add/static-website/git-repo/github';
  const accountId = res.locals.accountId;
  const state = req.query["state"];
  const code = req.query["code"];
  const cookieState = req.cookies.state;
  if (state != cookieState) {
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=does_not_match_cookie_state_and_state');
  }

  const http = new HttpService();
  // https://github.com/login/oauth/authorize?client_id=Iv1.23c7fcf64e1633cf&redirect_uri=https://core-wat-1087.staging.utopiops.com/integration/callbacks/git/github&state=123456789
  // github client secret: 1217c5151b35e3aa74ff83f4daeec4d150f92d7c
  const clientId = config.githubClientId;
  const clientSecret = config.githubClientSecret;
  var oauthTokenUrl = config.githubOauthTokenUrl + '?';
  oauthTokenUrl += 'code=' + code;
  oauthTokenUrl += '&client_id=' + clientId;
  oauthTokenUrl += '&client_secret=' + clientSecret;
  console.log('oauthTokenUrl: ---- ' + oauthTokenUrl);
  const body = {}
  const reqConfig = {
    headers: {
      Accept: 'application/json'
    }
  };
  let accessToken, refreshToken;
  try {
    const response = await http.post(oauthTokenUrl, body, reqConfig);
    console.log(response.data);
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    if (response.data.error) {
      console.error('error', response.data.error);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + response.data.error);
      return;
    }
    // res.send(response.data);
    // return;
  } catch(error) {
    console.error('error', error);
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=' + error);
    return;
  }

  


  const secretManagerUrl = config.secretManagerUrl;
  const result = await Integration.get(accountId, 'default_github');
  if (result.success) {
    try {
      console.log('Default integration founded');
      const reqConfig = {
        headers: {
          Authorization: 'Bearer ' + req.cookies.access_token,
          Cookie: `id_token=${req.user.idToken}`
        }
      };
      await http.delete(secretManagerUrl + '/simple/default_github_refresh_token', reqConfig);
      await http.post(secretManagerUrl + '/simple', {
        name: "default_github_refresh_token",
        description: "Default Github refresh token",
        value: refreshToken
      }, reqConfig);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?access_token=' + accessToken);
      return;
    } catch(error) {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + error);
      return;
    }

  } else {
    if (result.message === constants.errorMessages.models.elementNotFound) {
      try {
        console.log('Default integration not found');
        const reqConfig = {
          headers: {
            Authorization: 'Bearer ' + req.cookies.access_token,
            Cookie: `id_token=${req.user.idToken}`
          }
        };
        await http.post(secretManagerUrl + '/simple', {
          name: "default_github_refresh_token",
          description: "Default Github refresh token",
          value: refreshToken
        }, reqConfig);

        const integration = {
          name: 'default_github',
          url: 'https://api.github.com',
          tokenName: 'default_github_refresh_token',
          service: 'github_oauth',
          isDefault: false
        };
      
        const result = await Integration.add(accountId, integration);
        if (result.success) {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?access_token=' + accessToken);
          return;
        } else {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?error=can_not_add_integraion');
          return;
        }
      } catch(error) {
        res.redirect(constants.statusCodes.found,
          portalUrl + '?error=' + error);
        return;
      }
    } else {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=can_not_add_integraion');
      return;
    }
  }

}

//------------------------------------------------
async function gitlabCallbacks(req, res) {
  const portalUrl = config.portalUrl + '/fully-managed/apps/add/static-website/git-repo/gitlab';
  const accountId = res.locals.accountId;
  const state = req.query["state"];
  const code = req.query["code"];
  const cookieState = req.cookies.state;
  if (state != cookieState) {
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=does_not_match_cookie_state_and_state');
  }

  const http = new HttpService();
  // https://gitlab.com/oauth/authorize?client_id=ad4140b2b5a060d4c7a37d9514ed7cfeeabf4793a4dd32508f3711688e7f6ab4&redirect_uri=https://core-wat-1087.staging.utopiops.com/integration/callbacks/git/gitlab&response_type=code&state=123456789&scope=api+read_api+read_repository
  // gitlab client secret: dae7a606cf7a17ca241df1b019728262f1d3a5c77e627ee320d36eecfa4e7e15
  const clientId = config.gitlabClientId;
  const clientSecret = config.gitlabClientSecret;
  const redirectUrl = config.gitlabOauthRedirectUrl;
  var oauthTokenUrl = config.gitlabOauthTokenUrl + '?';
  oauthTokenUrl += 'code=' + code;
  oauthTokenUrl += '&client_id=' + clientId;
  oauthTokenUrl += '&client_secret=' + clientSecret;
  oauthTokenUrl += '&redirect_uri=' + redirectUrl;
  oauthTokenUrl += '&grant_type=authorization_code';
  console.log('oauthTokenUrl: ---- ' + oauthTokenUrl);
  const body = {}
  const reqConfig = {
    headers: {
      Accept: 'application/json'
    }
  };
  let accessToken, refreshToken;
  try {
    const response = await http.post(oauthTokenUrl, body, reqConfig);
    console.log(response.data);
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    if (response.data.error) {
      console.error('error', response.data.error);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + response.data.error);
      return;
    }
    // res.send(response.data);
    // return;
  } catch(error) {
    console.error('error', error);
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=' + error);
    return;
  }




  const secretManagerUrl = config.secretManagerUrl;
  const result = await Integration.get(accountId, 'default_gitlab');
  if (result.success) {
    try {
      console.log('Default integration founded');
      const reqConfig = {
        headers: {
          Authorization: 'Bearer ' + req.cookies.access_token,
          Cookie: `id_token=${req.user.idToken}`
        }
      };
      await http.delete(secretManagerUrl + '/simple/default_gitlab_refresh_token', reqConfig);
      await http.post(secretManagerUrl + '/simple', {
        name: "default_gitlab_refresh_token",
        description: "Default Gitlab refresh token",
        value: refreshToken
      }, reqConfig);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?access_token=' + accessToken);
      return;
    } catch(error) {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + error);
      return;
    }

  } else {
    if (result.message === constants.errorMessages.models.elementNotFound) {
      try {
        console.log('Default integration not found');
        const reqConfig = {
          headers: {
            Authorization: 'Bearer ' + req.cookies.access_token,
            Cookie: `id_token=${req.user.idToken}`
          }
        };
        await http.post(secretManagerUrl + '/simple', {
          name: "default_gitlab_refresh_token",
          description: "Default Gitlab refresh token",
          value: refreshToken
        }, reqConfig);

        const integration = {
          name: 'default_gitlab',
          url: 'https://gitlab.com',
          tokenName: 'default_gitlab_refresh_token',
          service: 'gitlab_oauth',
          isDefault: false
        };
      
        const result = await Integration.add(accountId, integration);
        if (result.success) {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?access_token=' + accessToken);
          return;
        } else {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?error=can_not_add_integraion');
          return;
        }
      } catch(error) {
        res.redirect(constants.statusCodes.found,
          portalUrl + '?error=' + error);
        return;
      }
    } else {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=can_not_add_integraion');
      return;
    }
  }

}

//------------------------------------------------
async function bitbucketCallbacks(req, res) {
  const portalUrl = config.portalUrl + '/fully-managed/apps/add/static-website/git-repo/bitbucket';
  const accountId = res.locals.accountId;
  const state = req.query["state"];
  const code = req.query["code"];
  const cookieState = req.cookies.state;
  if (state != cookieState) {
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=does_not_match_cookie_state_and_state');
  }

  const http = new HttpService();
  // https://bitbucket.org/site/oauth2/authorize?client_id=jWa34uEcmDXZ3YN4K2&response_type=code&state=123456789
  // bitbucket client secret: z3ZEpnT2Dmc7yjqwnTxmDmZTpebmNJEm
  const clientId = config.bitbucketClientId;
  const clientSecret = config.bitbucketClientSecret;
  var oauthTokenUrl = config.bitbucketOauthTokenUrl;
  console.log('oauthTokenUrl: ---- ' + oauthTokenUrl);
  var body = new FormData();
  body.append('grant_type', 'authorization_code');
  body.append('code', code);
  const reqConfig = {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(clientId+":"+clientSecret).toString('base64'),
      ...body.getHeaders()
    }
  };
  let accessToken, refreshToken;
  try {
    const response = await http.post(oauthTokenUrl, body, reqConfig);
    console.log(response.data);
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    if (response.data.error) {
      console.error('error', response.data.error);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + response.data.error);
      return;
    }
    // res.send(response.data);
    // return;
  } catch(error) {
    console.error('error', error);
    res.redirect(constants.statusCodes.found,
      portalUrl + '?error=' + error);
    return;
  }

  


  const secretManagerUrl = config.secretManagerUrl;
  const result = await Integration.get(accountId, 'default_bitbucket');
  if (result.success) {
    try {
      console.log('Default integration founded');
      const reqConfig = {
        headers: {
          Authorization: 'Bearer ' + req.cookies.access_token,
          Cookie: `id_token=${req.user.idToken}`
        }
      };
      await http.delete(secretManagerUrl + '/simple/default_bitbucket_refresh_token', reqConfig);
      await http.post(secretManagerUrl + '/simple', {
        name: "default_bitbucket_refresh_token",
        description: "Default Bitbucket refresh token",
        value: refreshToken
      }, reqConfig);
      res.redirect(constants.statusCodes.found,
        portalUrl + '?access_token=' + accessToken);
      return;
    } catch(error) {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=' + error);
      return;
    }

  } else {
    if (result.message === constants.errorMessages.models.elementNotFound) {
      try {
        console.log('Default integration not found');
        const reqConfig = {
          headers: {
            Authorization: 'Bearer ' + req.cookies.access_token,
            Cookie: `id_token=${req.user.idToken}`
          }
        };
        await http.post(secretManagerUrl + '/simple', {
          name: "default_bitbucket_refresh_token",
          description: "Default Bitbucket refresh token",
          value: refreshToken
        }, reqConfig);

        const integration = {
          name: 'default_bitbucket',
          url: 'https://api.bitbucket.org',
          tokenName: 'default_bitbucket_refresh_token',
          service: 'bit_bucket_oauth',
          isDefault: false
        };
      
        const result = await Integration.add(accountId, integration);
        if (result.success) {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?access_token=' + accessToken);
          return;
        } else {
          res.redirect(constants.statusCodes.found,
            portalUrl + '?error=can_not_add_integraion');
          return;
        }
      } catch(error) {
        res.redirect(constants.statusCodes.found,
          portalUrl + '?error=' + error);
        return;
      }
    } else {
      res.redirect(constants.statusCodes.found,
        portalUrl + '?error=can_not_add_integraion');
      return;
    }
  }

}
