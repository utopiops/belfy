const fileHelper = require('../../common/file-helper');
const handlebars = require('handlebars');

/**
 * Note: The new approach used in this resource (ssm parameter) is that we have some ready made
 * resources (like SecureString parameter that is currently implemented) in handlebars format, so
 * they won't be created through TF, and based on the parameter we just pick one, so they actually
 * don't need any parameter to render (they are valid .tf files stored as .handlebars).
 * In case the variables file become polluted with unrelated variables, we can get rid of it altogether,
 * change the approach and directly pass the values to the .handlebars files (which makes them actual 
 * templates) and render them instead of just copy and paste.
 */

exports.create = async (rootFolderPath, moduleFolderPath, options) => {

    const moduleFolderFullPath = `${rootFolderPath}/${moduleFolderPath}`
    await fileHelper.createFolder(moduleFolderFullPath);

    var ssmParameterModulePath = './terraform-modules/aws/ssm/ssm-parameter/';
    await fileHelper.copyFolder(ssmParameterModulePath, moduleFolderFullPath);

    var resourceFile = "";
    if (options.type === "SecureString") { // In the future we can add other types of ssm parameter here
      resourceFile = "secure-ssm-parameter";
    }
    const resource = await fileHelper.readFile(`${moduleFolderFullPath}/${resourceFile}.handlebars`);
    /// If we don't want to use variables file we can use this instead of writeToFile
    // const resTemplate = handlebars.compile(resource);
    // await fileHelper.appendToFile(`${moduleFolderFullPath}/main.tf`, resTemplate({options}));
    await fileHelper.writeToFile(`${moduleFolderFullPath}/${resourceFile}.tf`, resource);

    // add the module to the main.tf file in the root directory
    const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
    const template = handlebars.compile(use);

    const data = {
      name: options.name,
      value: options.value,
      moduleName: options.moduleName
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        ...data
    }));
}

