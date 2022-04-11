const fileHelper = require('../../common/file-helper');
const config = require('../../../config');
var handlebars = require('handlebars');
const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile);

exports.create = async (rootFolderPath, accountId, options, withExec) => {
    // create the folder
    // var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}/`

    // copy the RDS Sqlserver module to the user folder
    var rdsSqlserverModulePath = './terraform-modules/aws/rds-sqlserver/';
    var rdsSqlserverFolderPath = `${rootFolderPath}/rds-sqlserver`; // Go inside the rds-Sqlserver folder
    await fileHelper.copyFolder(rdsSqlserverModulePath, rdsSqlserverFolderPath);

    // add the module to the main.tf file in the root directory

    const use = await fileHelper.readFile(`${rdsSqlserverFolderPath}/use.handlebars`);
    const template = handlebars.compile(use);
    const data = {
        storageType: `"${options.storageType}"`,
        engineVersion: `"${options.engineVersion}"`,
        instanceClass: `"${options.instanceClass}"`,
        dbName: `"${options.dbName}"`,
        dbUsername: `"${options.dbUsername}"`,
        dbPassword: `"${options.dbPassword}"`,
        publiclyAccessible: `"${options.publiclyAccessible}"`,
        allocatedStorage: `"${options.allocatedStorage}"`,
        backupRetentionPeriod: `"${options.backupRetentionPeriod}"`,
        skipFinalSnapshot: `"${options.skipFinalSnapshot}"`,
        deletionProtection: `"${options.deletionProtection}"`,
        dbName: `"${options.dbName}"`,
        environment: `"${options.environment}"`,
        tagName: `"${options.tagName}"`,
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));

    if (withExec) {

        // run terraform

        var {
            stdout
        } = await execFile('terraform', ['init'], {
            cwd: rootFolderPath
        });
        console.log(`init: ${stdout }`);
        var {
            stdout2
        } = await execFile('terraform', ['apply', '-auto-approve'], {
            cwd: rootFolderPath
        });
        console.log(`init: ${stdout2 }`);
    }

}

exports.update = async (accountId, options) => {

}

exports.delete = async (accountId, options) => {

}