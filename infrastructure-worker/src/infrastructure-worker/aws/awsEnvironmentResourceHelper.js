const albHelper = require('./compute/albHelper');
const constants = require('../../shared/constants');
const vpcHelper = require('./compute/vpcHelper');


class AwsEnvironmentResourceHelper {

    canHandle(provider) {
        return provider.toLocaleLowerCase() === constants.applicationProviders.aws;
    }

    // Create the resources that should be shared between the applications in the environment
    async create(rootFolderPath, providerDetails, environment, accountId, stateKey, appResources) {

        let params = {
            environment:`"${environment}"`,
            vpcName: `"${environment}"`,
            tagName: `"${environment}"`,
        };
        const vpcComputed = calcVPCParams(providerDetails.region);
        params = Object.assign(params, vpcComputed);
        
        console.log(`vpcParams: ${JSON.stringify(params)}`);

        await vpcHelper.create(rootFolderPath, params); // TODO: check if I should even provide any details for the VPC except the AZ
        await albHelper.create(rootFolderPath, {
            environment,
            appResources: appResources.alb
        });
    }
}

const calcVPCParams = (region) => {

    const azPerRegion = {
        "us-west-2": ["a", "b", "c"],
        "us-west-1": ["a", "b"],
        "us-east-2": ["a", "b", "c"],
        "us-east-1": ["a", "b", "c", "d", "e"],
        "ap-south-1": ["a", "b", "c"],
        "ap-northeast-2": ["a", "b", "c", "d"],
        "ap-southeast-1": ["a", "b", "c"],
        "ap-southeast-2": ["a", "b", "c"],
        "ap-northeast-1": ["a", "c", "d"], //This is correct, b is missing!
        "ca-central-1": ["a", "b", "d"], //This is correct, c is missing!
        // "cn-north-1": ???, // not supported for now
        "eu-central-1": ["a", "b", "c"],
        "eu-west-1": ["a", "b", "c"],
        "eu-west-2": ["a", "b", "c"],
        "eu-west-3": ["a", "b", "c"],
        "sa-east-1": ["a", "b", "c"],
    };

    const azList = azPerRegion[region].map(az => region + az);

    // TODO: accept user input about the vpc cidr and subnets' sizes and calculate these based on the user input
    const vpcCidr = `"10.249.0.0/16"`;
    const publicSubnets = ["10.249.4.0/22", "10.249.8.0/22", "10.249.16.0/22"]
    const privateSubnets = ["10.249.32.0/22", "10.249.64.0/22", "10.249.128.0/22"]

    const pub = publicSubnets.slice(0, azList.length);
    const prv = privateSubnets.slice(0, azList.length);

    return {
        vpcNetworkCidr: vpcCidr,
        azs: JSON.stringify(azList),
        public_subnets: JSON.stringify(pub),
        private_subnets: JSON.stringify(prv),
    };
};

module.exports = AwsEnvironmentResourceHelper;