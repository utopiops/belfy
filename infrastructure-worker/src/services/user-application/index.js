const http = require('../../shared/http.service');
const config = require('../../config');
const HttpHelper = require('../../shared/http.helper');
const AuthTokenHelper = require('../../shared/authToken.helper');

class UserApplicationService {
    async getEnvironmentDetails(user, environmentName) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v2/applications/environment/name/${environmentName}?accountId=${user.accountId}&userId=${user.id}`);
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async getEnvironmentV2Details(user, environmentName, action, version) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .get(`${config.apiUrl}/v3/environment/name/${environmentName}/version?action=${action}&accountId=${user.accountId}&userId=${user.id}${version ? `&version=${version}` : ''}`);
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }
    async getApplicationDetails(user, environmentName, applicationName, version = null) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/application/name/${applicationName}/tf?accountId=${user.accountId}&userId=${user.id}${version ? `&version=${version}` : ''}`);
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async getApplicationV2Details(user, environmentName, applicationName, version = null) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .get(`${config.apiUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/tf?accountId=${user.accountId}&userId=${user.id}${version ? `&version=${version}` : ''}`);
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }
    async getDatabaseDetails(user, environmentName, dbsName, version = null) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/database/name/${dbsName}/tf?accountId=${user.accountId}&userId=${user.id}${version ? `&version=${version}` : ''}`);
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async getDatabaseV2Details(user, environmentName, dbsName, version = null) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .get(`${config.apiUrl}/v3/database/environment/name/${environmentName}/database/name/${dbsName}/tf?accountId=${user.accountId}&userId=${user.id}${version ? `&version=${version}` : ''}`);
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }



    async setEnvironmentDeploymentStatus(user, environmentName, statusCode) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .patch(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/status?accountId=${user.accountId}&userId=${user.id}`, { statusCode });
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }

    async setEnvironmentV2DeploymentStatus(user, environmentName, statusCode, jobId) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .patch(`${config.apiUrl}/v3/environment/name/${environmentName}/status?accountId=${user.accountId}&userId=${user.id}`, { statusCode, jobId });
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }
    async setEnvironmentApplicationDeploymentState(user, environmentName, applicationName, stateCode, jobId) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/application/name/${applicationName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async setEnvironmentApplicationV2DeploymentState(user, environmentName, applicationName, stateCode, jobId, dynamicName) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .post(`${config.apiUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId, dynamicName });
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }
    async setEnvironmentDatabaseDeploymentState(user, environmentName, databaseName, stateCode, jobId) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/database/name/${databaseName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async setEnvironmentDatabaseV2DeploymentState(user, environmentName, databaseName, stateCode, jobId) {
      try {
          const token = await AuthTokenHelper.getToken();
          const httpHelper = new HttpHelper();
          const result = await httpHelper
              .withAuth(token)
              .post(`${config.apiUrl}/v3/database/environment/name/${environmentName}/database/name/${databaseName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
          return result.data;
      } catch (error) {
          console.log(`error: ${error.message}`);
          throw error;
      }
    }

    async setTerraformModuleDeploymentState(user, environmentName, ModuleName, stateCode, jobId) {
      try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        const result = await httpHelper
            .withAuth(token)
            .post(`${config.apiUrl}/terraform-module/environment/name/${environmentName}/terraform_module/name/${ModuleName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
        return result.data;
      } catch (error) {
        console.log(`error: ${error.message}`);
        throw error;
      }
    }

    async setKubernetesDeploymentState(user, environmentName, kubernetesClusterName, stateCode, jobId) {
      try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        const result = await httpHelper
            .withAuth(token)
            .post(`${config.apiUrl}/kubernetes/environment/name/${environmentName}/cluster/name/${kubernetesClusterName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
        return result.data;
      } catch (error) {
        console.log(`error: ${error.message}`);
        throw error;
      }
    }

    async setDomainDeploymentState(user, domainName, stateCode, jobId) {
      try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        const result = await httpHelper
            .withAuth(token)
            .post(`${config.apiUrl}/domain/accountId/${user.accountId}/name/${domainName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
        return result.data;
      } catch (error) {
        console.log(`error: ${error.message}`);
        throw error;
      }
    }

    async setUtopiopsApplicationDeploymentState(user, appName, stateCode, jobId) {
      try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        const result = await httpHelper
            .withAuth(token)
            .post(`${config.apiUrl}/applications/utopiops/accountId/${user.accountId}/name/${appName}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
        return result.data;
      } catch (error) {
        console.log(`error: ${error.message}`);
        throw error;
      }
    }

    async getApplication(user, environmentName, version) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/applications/environments/${environmentName}/version/${version}?accountId=${user.accountId}&userId=${user.id}`);

            const userApplication = result.data;// First .data is because of axios, second .data is because of the core API
            console.log(`userApplication: ${JSON.stringify(userApplication)}`);
            return userApplication;
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }

    async saveApplication(application, user, jobId) {
        try {
            console.log(`sending to ${config.apiUrl}/applications/save, jobid: ${jobId}`);

            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/applications/save?accountId=${user.accountId}&userId=${user.id}`, { application, jobId });

            console.log(`Sent the request to save the application`);
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
        }
    }

    async getApplicationResources(user, environmentName, applicationName) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v2/applications/environment/name/${environmentName}/application/name/${applicationName}/resources?accountId=${user.accountId}&userId=${user.id}`);
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
    async getApplicationV2Resources(user, environmentName, applicationName) {
        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/resources?accountId=${user.accountId}&userId=${user.id}`);
            return result.data;
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = UserApplicationService;