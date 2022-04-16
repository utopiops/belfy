const ConfigStore   = require('configstore');
const pkg           = require('../../package.json');
const conf          = new ConfigStore(pkg.name);
const User          = require('../../db/models/user');
const ObjectId      = require('mongoose').Types.ObjectId;
const Provider      = require('../../db/models/provider');

class ConfigHandler {

    constructor() {
        // Empty
    }

    async getAccountCredentials(accountId, providerName) {
        throw new Error("deprecated method call. Use Provider.getAccountCredentials(accountId, envProvider.providerDisplayName);")
        // const filter = { accountId: new ObjectId(accountId), 'backend.name': providerName }
        // const provider = await Provider.findOne(filter).exec();
        // const credentials = provider.backend.credentials;
        // return credentials;
    }

    getAwsBaseConfig(id) {
        var user = new User();
        return user.getAwsBaseConfig(id);
    }

    getJiraConfig(id) {
        var user = new User();
        return user.getJiraConfig(id)
    }

    // Jenkins configs
    getJenkinsUrl(id) {
        var user = new User();
        return user.getJenkinsUrl(id)
    }
    getJenkinsCredentials(id) {
        var user = new User();
        return user.getJenkinsCredentials(id)
    }

    getIntegrationUrls() {
        var urls = getIfHas(conf, 'integrationUrls');
        return urls;
    }

    setIntegrationUrls(urls) {
        conf.set('integrationUrls', urls);
    }

}

const config = {
    amqpUrl: process.env.AMQP_URL,
    dbUrl: process.env.DB_URL,
    queueName: process.env.QUEUE_NAME,
    passwordTokenSecret: process.env.PASSWORD_TOKEN_SECRET,
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    portalUrl: process.env.PORTAL_URL,
    systemSender: process.env.SYSTEM_SENDER,
    sendGridUrl: process.env.SENDGRID_URL,
    environmentsTerraformRootS3Bucket: process.env.ENV_TF_S3_BUCKET, // the bucket to store all the tf codes generated for users' environments and applications
    jwtSecret: process.env.JWT_SECRET,
    deploymentManagerUrl: process.env.DEPLOYMENT_MANAGER_URL,
    dmbqUrl: process.env.DMBQ_URL,
    ciHelperUrl: process.env.CI_HELPER_URL,
    logIntegrationUrl: process.env.LOG_INTEGRATION_URL,
    nightingaleUrl: process.env.NIGHTINGALE_URL,
    accessManagerUrl: process.env.ACCESS_MANAGER_URL,
    alarmManagerUrl: process.env.ALARM_MANAGER_URL,
    idsAdminUrl: process.env.IDS_ADMIN_URL,
    jwksUrl: process.env.JWKS_URL,
    secretManagerUrl: process.env.SECRET_MANAGER_URL,
    notificationManagerUrl: process.env.NOTIFICATION_MANAGER_URL,
    idsPublicUrl: process.env.IDS_PUBLIC_URL,
    clientCredentials: process.env.CLIENT_CREDENTIALS,
    secretManagerUrl: process.env.SECRET_MANAGER_URL,
    pipelineHelperUrl: process.env.PIPELINE_HELPER_URL,
    planManagerUrl: process.env.PLAN_MANAGER_URL,
    jenkinsUrl: process.env.JENKINS_URL,
    jenkinsUsername: process.env.JENKINS_USERNAME,
    jenkinsPassword: process.env.JENKINS_PASSWORD,
    staticWebsiteBucket: process.env.STATIC_WEBSITE_BUCKET,
    staticWebsiteSubdomain: process.env.STATIC_WEBSITE_SUBDOMAIN,
    staticWebsiteCloudfrontDnsName: process.env.STATIC_WEBSITE_CLOUDFRONT_DNS_NAME,
    staticWebsiteHostedZoneId: process.env.STATIC_WEBSITE_HOSTED_ZONE_ID,
    coreUrl: process.env.CORE_URL,
    utopiopsProviderRegion: process.env.UTOPIOPS_PROVIDER_REGION,
    utopiopsProviderBucket: process.env.UTOPIOPS_PROVIDER_BUCKET,
    utopiopsProviderKmsKeyId: process.env.UTOPIOPS_PROVIDER_KMS_KEY_ID,
    utopiopsProviderDynamodb: process.env.UTOPIOPS_PROVIDER_DYNAMODB,
    functionSubdomain: process.env.FUNCTION_SUBDOMAIN,
    functionHostedZoneId: process.env.FUNCTION_HOSTED_ZONE_ID,
    loadBalancerDns: process.env.LOAD_BALANCER_DNS,
    gitIntegrationUrl: process.env.GIT_INTEGRATION_URL,
    githubOauthTokenUrl:    process.env.GITHUB_OAUTH_TOKEN_URL,
    githubClientId:         process.env.GITHUB_CLIENT_ID,
    githubClientSecret:     process.env.GITHUB_CLIENT_SECRET,
    githubWebhookSecret:    process.env.GITHUB_WEBHOOK_SECRET,
    gitlabOauthTokenUrl:    process.env.GITLAB_OAUTH_TOKEN_URL,
    gitlabOauthRedirectUrl: process.env.GITLAB_OAUTH_REDIRECT_URL,
    gitlabClientId:         process.env.GITLAB_CLIENT_ID,
    gitlabClientSecret:     process.env.GITLAB_CLIENT_SECRET,
    gitlabWebhookSecret:    process.env.GITLAB_WEBHOOK_SECRET,
    bitbucketOauthTokenUrl: process.env.BITBUCKET_OAUTH_TOKEN_URL,
    bitbucketClientId:      process.env.BITBUCKET_CLIENT_ID,
    bitbucketClientSecret:  process.env.BITBUCKET_CLIENT_SECRET,
    helmManagerUrl:        process.env.HELM_MANAGER_URL,
    dockerSubdomain:        process.env.DOCKER_SUBDOMAIN,
    ecrRepositoryBaseUrl:   process.env.ECR_REPOSITORY_BASE_URL,
    slackDemoBotToken:      process.env.SLACK_DEMO_BOT_TOKEN,
    slackDemoChannelId:    process.env.SLACK_DEMO_CHANNEL_ID,
}

module.exports = ConfigHandler;
module.exports.config = config;

// Private functions

function getIfHas(conf, key) {
    if (conf.has(key)) {
        return conf.get(key);
    } else {
        return null;
    }
}