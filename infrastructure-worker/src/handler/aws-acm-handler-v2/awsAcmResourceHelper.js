const path = require('path');
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const handlebars = require('handlebars');
const config = require('../../config');

exports.renderTerraform = async (rootFolderPath, environmentName, certificate) => {
    // Note: unlike other components like applications, here we take a different approach and don't create a module and indeed we just directly copy the 
    // rendered file (from handlebars) into a file in the root folder path.
    const params = calculateParameters(certificate, environmentName);

    // Copy the ECS service module to the user folder
    var acmCertificateModulePath = './terraform-modules/aws/acm_certificate/';
    await fileHelper.copyFolder(acmCertificateModulePath, rootFolderPath);

    const cert = await fileHelper.readFile(`${rootFolderPath}/acm_certificate.handlebars`);
    const compiled = handlebars.compile(cert);
    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, compiled(params));

};


function calculateParameters(certificate, environmentName) {
    let parameters = {
      name: `${environmentName}-${certificate.name || certificate.identifier}`,
      hostedZone: certificate.environment.hostedZone ? certificate.environment.hostedZone.name : certificate.environment.domain.dns,
      domainName: `${certificate.domainName}.${certificate.environment.hostedZone ? certificate.environment.hostedZone.name : certificate.environment.domain.dns}`
    };
    console.log(parameters);
    return parameters;
}
