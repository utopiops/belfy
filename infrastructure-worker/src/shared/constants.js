const constants = {
    jobPaths: {
        updateApplication: 'application/update',
        createApplication: 'application/create',
        deleteApplication: 'application/delete',
        dryRunApplication: 'application/dry_run',
        activateApplication: 'application/activate',
        createApplicationAwsProviderV2: 'application/v2/provider/aws/create',
        destroyApplicationAwsProviderV2: 'application/v2/provider/aws/destroy',
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
    },
    jobStats: {
        complete: 'complete',
        created: 'created',
        processing: 'processing',
        failed: 'failed',
        timeout: 'timeout'
    },
    logProviders: {
        CloudWatch: 'cloudwatch'
    },
    topics: {
        addProvider: 'add_provider',
        handleCI: 'handle_ci',
        handleUserApplication: 'handle_use_application',
        createEcsApplication: 'create_ecs_application',
        createApplication: 'create_application',
        createK8sMongoDb: 'create_k8s_mongodb',
        utility: 'utility'
    },
    utilityIds: {
        awsAddSsl: 'awsAddSsl'
    },
    operations: {
        create: 'create',
        update: 'update',
        delete: 'delete'
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
    applicationKins: {
        ecs: 'ecs',
        kubernetes: 'kubernetes',
        s3Website: 's3_website'
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
    applicationProviders: {
        aws: 'aws'
    },
    integrationServices: {
      sentry: 'sentry',
      gitlab: 'gitlab',
      github: 'github',
      bitBucket: 'bit_bucket',
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
