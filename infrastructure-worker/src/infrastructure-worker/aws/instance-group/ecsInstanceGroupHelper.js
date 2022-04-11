const uuid      = require('uuid/v4');
const constants = require('../../../shared/constants');
const fileHelper= require('../../common/file-helper');
const handlebars= require('handlebars');

const AuthTokenHelper = require('../../../shared/authToken.helper');
const HttpHelper      = require('../../../shared/http.helper');
const config          = require('../../../config');

/**
 * NOTE: This Helper (like ecsApplicationHelper) is tightly coupled with creating applications,
 * so it's usable in the context of creating an application (unlike say ecsHelper or ecsServiceHelper which still
 * more or less depend on the context).
 * At the moment it's not very clear what is the best organization for the modules that implement part of the
 * create application logic and the modules that can provision a resource irrespective of the context.
 */

class EcsInstanceGroupHelper {
  
  canHandle = (igType) => igType === 'ecs';
  canHandleNew = (platform, provider) =>  {
    console.log(`canHandleNew: ${platform} - ${provider}`);
    return platform.toLocaleLowerCase() === constants.applicationKins.ecs && provider.toLocaleLowerCase() === constants.applicationProviders.aws;
  }

  parse = (infrastructure, igName) => {
    return this.extractEcsInstanceGroup(infrastructure, igName);
  }
  // TODO: DELETE IF NOT USED
  handleNew = async (infrastructure, rootFolderPath, environmentName, region, user, igName = "") => {
    // This handler handles existing and new instance groups. In case the instance group is new, it has to be parsed
    // and after creating the resource the parsed instance group should be returned to be stored in the database
    const instanceGroup = this.extractEcsInstanceGroup(infrastructure, igName);
    return await this.handle(rootFolderPath, instanceGroup, environmentName, region, user);
  }
  
  handle = async (rootFolderPath, instanceGroup, environmentName, region, user) => {
    const moduleFolderPath = `instance-groups/${instanceGroup.name}`; // This shows that we're aware of the context
    const moduleFolderFullPath = `${rootFolderPath}/${moduleFolderPath}`
    console.log(`creating the ecs instance group`);
    await fileHelper.createFolder(moduleFolderFullPath);
    console.log(`created the folder::: ${moduleFolderFullPath}`);

    // copy the ECS module from igModulePath (path to the module in the source code) to the user folder
    const igModulePath = './terraform-modules/aws/instance-group/';
    await fileHelper.copyFolder(igModulePath, moduleFolderFullPath);
    console.log(`copied the module aws/instance-group to the folder ${moduleFolderFullPath}`);

    // Get the latest ECS AMI
    let ami = '';
    try {

      const token = await AuthTokenHelper.getToken();
      console.log(`token:${token}`);
      const httpHelper = new HttpHelper();
      const result = await httpHelper
          .withAuth(token)
          .get(`${config.apiUrl}/inf/aws/ssm/getParametersValues?region=${region}&names=/aws/service/ecs/optimized-ami/amazon-linux-2/recommended&accountId=${user.accountId}&userId=${user.id}`);
      console.log(`result: ${result.data}`);
      
      if (result && result.data.length) {
        ami = result.data[0];
      } else {
        console.log(`no result`);
        throw new Error("No AMI found for ECS in this region!")
      }
    } catch(e) {
      console.log(`error: ${e.message}`);
      throw e; // todo: handle properly
    }

    console.log(`ami: ${ami}`);

    const data = { 
        // TODO: Add the instance profile (role created as part of aws/ecs module)
        igModulePath: `./${moduleFolderPath}`,
        name: instanceGroup.name,
        environment: environmentName,
        roleId: "${aws_iam_instance_profile.ecs-instance-profile.id}", // This shit again shows that this is context-aware and if we change the code in ecs module we have to update this as well
        imageId: ami,
        // tags: `"${data.labels}`, // TODO: Implement tags/labels
        rootVolumeSize: `${instanceGroup.rootVolumeSize || 30}`,
        rootVolumeType: `${instanceGroup.rootVolumeType || "gp2"}`,
        rootVolumeDelOnTerm: `${instanceGroup.rootVolumeDelOnTerm || true}`,
        instanceType: `${instanceGroup.instanceType}`,
        keyPairName: `${instanceGroup.keyPairName || "dummy"}`, // TODO: UI should support this
        maxInstanceSize: instanceGroup.count, // TODO: Implement Autoscaling
        minInstanceSize: instanceGroup.count,
        desiredCapacity: instanceGroup.count,
        userData: `#!/bin/bash
echo ECS_CLUSTER=${environmentName} >> /etc/ecs/ecs.config
ECS_BACKEND_HOST= >> /etc/ecs/ecs.config`,
    }

    console.log(`creating ECS instance group: ${instanceGroup.name}`);
 
    // Add the aws_launch_configuration resource to the main.tf in the copied file.
    // The reason that LC is separated in a different template file is that it can have
    // multiple blocks of EBS volume dynamically set based on the user input.
    // TODO: Replace this block of code by using the dynamic keyword available in TF 0.12. The whole reason of this template is to support optional attributes
    const td = await fileHelper.readFile(`${moduleFolderFullPath}/launch-configuration.handlebars`);
    const tdTemplate = handlebars.compile(td);
    await fileHelper.appendToFile(`${moduleFolderFullPath}/main.tf`, tdTemplate({
        rootVolumeType: data.rootVolumeType,
        rootVolumeIops: data.rootVolumeIops,
        ebsBlocks: data.otherVolumes || []
    }));

    // add the module to the main.tf file in the root directory
    const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
    const template = handlebars.compile(use);
    
    await fileHelper.copyFile(`${moduleFolderFullPath}/ecs-iam.handlebars`, `${moduleFolderFullPath}/ecs-iam.tf`)

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));
    console.log(`added the aws/instance-group module to the main.tf`);
    return instanceGroup;
  }

  extractEcsInstanceGroup = (infrastructure, igName) => {
    var ig = infrastructure['newInstanceGroup'];
    ig.name = igName ? igName : uuid();
    ig.kind = "ecs" // This is only for the database purpose. In this handler we already know the kind!
    return ig;
  }
}


module.exports = EcsInstanceGroupHelper;