const constants = {
    errorMessages: {
        models: {
            duplicate: 'An attempt was made to create an object that already exists.',
            elementNotFound: 'Resource not found'
        }
    },
    jobPaths: {
        deleteApplication: 'application/delete',
        updateApplication: 'application/update',
        createApplication: 'application/create',
        dryRunApplication: 'application/dry_run',
        activateApplication: 'application/activate',
        createApplicationAwsProviderV2: 'application/v2/provider/aws/create', // TODO: remove Application from the word
        destroyApplicationAwsProviderV2: 'application/v2/provider/aws/destroy', // TODO: remove Application from the word
        createAzureProviderV2: 'application/v2/provider/azure/create',
        destroyAzureProviderV2: 'application/v2/provider/azure/destroy',
        createDigitalOceanProvider: 'provider/do/create',
        destroyDigitalOceanProvider: 'provider/do/destroy',
        createGcpProvider: 'provider/gcp/create',
        destroyGcpProvider: 'provider/gcp/destroy',
        deployACMCertificateV2: 'v2/certificate/acm/deploy',
        destroyACMCertificateV2: 'v2/certificate/acm/destroy',
        deployApplicationAlarmCloudWatch: 'alarm/application/cloudwatch/deploy',
        destroyApplicationAlarmCloudWatch: 'alarm/application/cloudwatch/destroy',
        deployEnvironmentAlarmCloudWatch: 'alarm/environment/cloudwatch/deploy',
        destroyEnvironmentAlarmCloudWatch: 'alarm/environment/cloudwatch/destroy',
        deployACMCertificate: 'certificate/acm/deploy',
        destroyACMCertificate: 'certificate/acm/destroy',
        dryRunAwsEnvironmentV4: 'environment/aws/dry_run',
        deployAwsEnvironmentV4: 'environment/aws/deploy',
        destroyAwsEnvironmentV4: 'environment/aws/destroy',
        dryRunAzureEnvironment: 'environment/azure/dry_run',
        deployAzureEnvironment: 'environment/azure/deploy',
        destroyAzureEnvironment: 'environment/azure/destroy',
        dryRunGcpEnvironment: 'environment/gcp/dry_run',
        deployGcpEnvironment: 'environment/gcp/deploy',
        destroyGcpEnvironment: 'environment/gcp/destroy',
        dryRunApplicationEcsV4: 'v4/application/ecs/dry_run',
        deployApplicationEcsV4: 'v4/application/ecs/deploy',
        destroyApplicationEcsV4: 'v4/application/ecs/destroy',
        dryRunApplicationS3WebsiteV4: 'v4/application/s3website/dry_run',
        deployApplicationS3WebsiteV4: 'v4/application/s3website/deploy',
        destroyApplicationS3WebsiteV4: 'v4/application/s3website/destroy',
        dryRunApplicationClassicBakedV4: 'v4/application/classic_baked/dry_run',
        deployApplicationClassicBakedV4: 'v4/application/classic_baked/deploy',
        destroyApplicationClassicBakedV4: 'v4/application/classic_baked/destroy',
        dryRunApplicationAzureStaticWebsite: 'application/azure_static_website/dry_run',
        deployApplicationAzureStaticWebsite: 'application/azure_static_website/deploy',
        destroyApplicationAzureStaticWebsite: 'application/azure_static_website/destroy',
        dryRunDatabaseRdsV4: 'v4/database/rds/dry_run',
        deployDatabaseRdsV4: 'v4/database/rds/deploy',
        destroyDatabaseRdsV4: 'v4/database/rds/destroy',
        deployTerraformModule: 'terraform_module/deploy',
        destroyTerraformModule: 'terraform_module/destroy',
        dryRunTerraformModule: 'terraform_module/dry_run',
        deployKubernetesEksCluster: 'kubernetes/eks_cluster/deploy',
        destroyKubernetesEksCluster: 'kubernetes/eks_cluster/destroy',
        dryRunKubernetesEksCluster: 'kubernetes/eks_cluster/dry_run',
        deployElasticacheRedis: 'elasticache/redis/deploy',
        destroyElasticacheRedis: 'elasticache/redis/destroy',
        dryRunElasticacheRedis: 'elasticache/redis/dry_run',
        deployUtopiopsStaticWebsite: 'utopiops_application/static_website/deploy',
        destroyUtopiopsStaticWebsite: 'utopiops_application/static_website/destroy',
        deployDomain: 'domain/deploy',
        destroyDomain: 'domain/destroy',
        utilityMisc: 'utility/misc',
        undecided: 'undecided'
    },
    jobStats: { //TODO: delete this, it's got a typo
        complete: 'complete',
        created: 'created',
        processing: 'processing',
        failed: 'failed',
    },
    jobStatus: {
        complete: 'complete',
        created: 'created',
        processing: 'processing',
        failed: 'failed',
        timeout: 'timeout'
    },
    statusCodes: {
        badRequest: 400,
        duplicate: 409,
        ise: 500,
        notFound: 404,
        notAuthorized: 401,
        notAllowed: 405,
        ok: 200,
        partialSuccess: 206,
        ue: 422,
        found: 302
    },
    awsSdkApiVersion: {
        iam: '2010-05-08',
        route53: '2013-04-01',
        s3: '2006-03-01'
    },
    accountStatus: {
        pending: 'pending',
        registered: 'registered'
    },
    queueNames: {
        appQueue: 'test-jobs-queue'
    },
    resourceStatus: {
        creating: 'creating',
        ready: 'ready',
        deleting: 'deleting',
        // new
        created: 'created',
        deploying: 'deploying',
        destroying: 'destroying',
        deployed: 'deployed',
        destroyed: 'destroyed',
        deployFailed: 'deploy_failed',
        destroyFailed: 'destroy_failed',
    },
    topics: {
        addProvider: 'add_provider',
        dryRunApplication: 'dry_run_application',
        activateApplication: 'activate_application',
        handleCI: 'handle_ci',
        handleUserApplication: 'handle_use_application',
        createEcsApplication: 'create_ecs_application',
        createApplication: 'create_application',
        createK8sMongoDb: 'create_k8s_mongodb',
        utility: 'utility'
    },
    operations: {
        create: 'create',
        update: 'update',
        delete: 'delete',
        plan: 'plan',
        apply: 'apply'
    },
    applicationKinds: {
        ecs: 'ecs',
        eksWebService: 'eks_web_service',
        kubernetes: 'kubernetes',
        s3Website: 's3_website',
        classicBaked: 'classic_baked',
        azureStaticWebsite: 'azure_static_website',
        staticWebsite: 'static_website',
        customDomainStatic: 'custom_domain_static_website',
        eksBackgroundJob: 'eks_background_job',
        docker: 'docker',
        function: 'function'
    },
    databaseServerKinds: {
        rds: 'rds'
    },
    applicationProviders: { // The name doesn't make sense anymore, use cloudProviders
        aws: 'aws',
        gcp: 'gcp',
        azure: 'azure',
        digitalOcean: 'do'
    },
    cloudProviders: {
        aws: 'aws',
        gcp: 'gcp',
        azure: 'azure',
        digitalOcean: 'do'
    },
    kubernetesClusterKinds: {
        eks: 'eks'
    },
    integrationServices: {
      sentry: 'sentry',
      gitlab: 'gitlab',
      gitlabOauth: 'gitlab_oauth',
      github: 'github',
      githubOauth: 'github_oauth',
      bitBucket: 'bit_bucket',
      bitBucketOauth: 'bit_bucket_oauth',
      pagerDuty: 'pager_duty',
      newRelic: 'new_relic',
      email: 'email',
      slack: 'slack',
      jira: 'jira',
      sendgridEmail: 'sendgrid_email'
    },
    redisJob: {
        status: {
            // The status can be: pending(just put into the Redis), processing, completed (optional if the entry is deleted after completion), failed (maybe needed)
            pending: 'pending',
            processing: 'processing',
            completed: 'completed'
        },
        type: {
            pipeline: 'pipeline'
        }
    }
}
module.exports = constants;

