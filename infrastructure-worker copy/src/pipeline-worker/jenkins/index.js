const constants = require('../../shared/constants');

class JenkinsPipelineService {

    /**
    accountId: id of the user; used to retreive the URL of the Jenkins instance of the user created
    through Water. TODO: BTW, thinks about which Jenkins instance (their own one or Water Jenkins) should be
    displayed in the Jenkins view.
    steps: array of objects, where each object is a step. Each step is an object like this:
        step {
            stepName: string; // One of the steps form the steps list
            inputs: string[];
            mappings: any; // key-value input: value. value can be #stepNumber(should be less than index of this step in the array of steps)#output or a literal value
        }
    */
    async addJob(accountId, steps, jobName) {

        const job = {
            type: constants.redisJob.type.pipeline,
            details: {
                steps: steps,
                name: jobName
            },
            status: constants.redisJob.status.pending,
            id: '1234' // TODO: how to generate this?
        }
    
        // todo: movie it to the beginning of the file, moved it here to unblock the ecs service
        const redis = require('../../shared/redis');

        // Add it to the Redis (key would be sth like jenkins::${accountId}, or transform(accountId))
        await redis.hmset('jenkins::2', ['type', job.type, 'details', JSON.stringify(job.details), 'status', job.status, 'id', job.id]);
    }

    async addEcsDefaultJob(accountId, details) {

        const steps = [{
            id: '1',
            parameters: {
                repoUrl: details.repoUrl
            },
            credentials: {
                repoCredentials: {
                    username: details.repoUsername,
                    password: details.repoPassword
                }
            }
        },
        {
            id: '2',
            parameters: {
                repoUrl: details.dockerRepoUrl,
                dockerFilePath: './Dockerfile',
                context: '.'
            }
        },
        {
            id: '3',
            credentials: {
                accessKeyId: details.accessKeyId,
                secretAccessKey: details.secretAccessKey
            },
            parameters: {
                repoUrl: details.dockerRepoUrl,
                region: details.region
            }
        },
        {
            id: '4',
            credentials: {
                accessKeyId: details.accessKeyId,
                secretAccessKey: details.secretAccessKey
            },
            parameters: {
                clusterName: details.clusterName,
                serviceName: details.serviceName,
                region: details.region
            }
        }];
        this.addJob(accountId, steps, details.name);
    }

}

module.exports = JenkinsPipelineService;