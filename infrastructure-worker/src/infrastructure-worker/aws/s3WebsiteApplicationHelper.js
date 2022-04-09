const constants     = require('../../shared/constants');
const fileHelper    = require('../common/file-helper');
const handlebars    = require('handlebars');


/**
 * This helper is responsible for creating the resources:
 *  - S3 bucket with static website enabled, CloudFront distribution, route53 record
 *  - (optional) S3 bucket for redirect, route53 record
 */
class handler {
    canHandle = (kind, provider) => {
        // TODO: Checking the provider looks redundant here, just remove it if it's safe and if not MAKE it safe!
        return kind.toLocaleLowerCase() === constants.applicationKins.s3Website && provider.toLocaleLowerCase() === constants.applicationProviders.aws;
    }

    parse = async (application) => {
        console.log(`parsing application: ${JSON.stringify(application, null, 2)}`);
        return this.initializeApplication(application);
    }

    // TODO: Add exception handling
    handle = async (application, rootFolderPath, environmentName, region, accountId, isNew = false) => {
        var applicationFolderPath = `${application.name}`; // The relative path the module will be copied to
        const moduleFolderFullPath = `${rootFolderPath}/${applicationFolderPath}`;
        if (! await fileHelper.createFolder(moduleFolderFullPath)) {
            return;
        }

        const s3Website = './terraform-modules/aws/s3-cloudfront-website/';
        await fileHelper.copyFolder(s3Website, moduleFolderFullPath);

        const data = {            
            environment: environmentName,
            appName: application.name,
            modulePath: `./${application.name}`,
            mainDomainName: application.hostedZone.replace(/\.$/, ""),
            mainRecordName: application.subdomain,
            indexDocument: application.indexDocument,
            errorDocument: application.errorDocument,
            acmCertificateArn: application.acmCertificateArn
        }
        const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
        const template = handlebars.compile(use);
        await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
            ...data
        }));

        if (application.redirect) {
            // Copy the redirect handlebars as tf file
            const redirect = await fileHelper.readFile(`${moduleFolderFullPath}/redirect.handlebars`);
            await fileHelper.writeToFile(`${moduleFolderFullPath}/redirect.tf`, redirect);
        }
        return {};
    };

    initializeApplication = (applicationDetails) => {
        let appDetails = {};
        appDetails.name = applicationDetails['generalDetails']['appName'];
        appDetails.description = applicationDetails['generalDetails']['description'];
        appDetails.provider = applicationDetails['generalDetails']['provider'];
        appDetails.platform = applicationDetails['platform']['name'];
        appDetails.subdomain = applicationDetails['platform']['subdomain'];
        appDetails.hostedZone = applicationDetails['platform']['hostedZone'];
        appDetails.redirect = applicationDetails['platform']['redirect'];
        appDetails.indexDocument = applicationDetails['platform']['indexDocument'];
        appDetails.errorDocument = applicationDetails['platform']['errorDocument'];
        appDetails.acmCertificateArn = applicationDetails['platform']['acmCertificateArn'];
        appDetails.kind = constants.applicationKins.s3Website;
        appDetails.logProviderId = applicationDetails['logsmetrics']['logProvider'];
        appDetails.metricProviderId = applicationDetails['logsmetrics']['metricProvider'];
        return appDetails;
    }


}

module.exports = handler;