const path = require('path');
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const handlebars = require('handlebars');
const config = require('../../config');
const predefinedEnvironmentAlarms = require('./predefinedEnvrionmentAlarms');
const { get } = require('lodash');

exports.renderTerraform = async (rootFolderPath, environment, user, providerBucketName, providerRegion, alarm) => {
    const moduleFolderFullPath = rootFolderPath; // The relative path the module will be copied to
    console.log(`moduleFolderFullPath`, moduleFolderFullPath);
    console.log(`alarm::`, alarm);

    // Note: unlike other components like applications, here we take a different approach and don't create a module and indeed we just directly copy the 
    // rendered file (from handlebars) into a file in the root folder path.


    const params = calculateParameters(alarm);
    if (params === null) {
      throw new Error("invalid alarm");
    }



    // Copy the ECS service module to the user folder
    var cloudwatchAlarmModulePath = './terraform-modules/aws/cloudwatch-alarm/';
    await fileHelper.copyFolder(cloudwatchAlarmModulePath, rootFolderPath);

    // Add the task_definition resource to the main.tf in the copied file.
    // The reason that TD is separated in a different template file is that it can have
    // multiple blocks of volume dynamically set based on the user input.
    // TODO: Replace this block of code by using the dynamic keyword available in TF 0.12
    const td = await fileHelper.readFile(`${rootFolderPath}/alarm.handlebars`);
    const tdTemplate = handlebars.compile(td);
    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, tdTemplate(params));

};


function calculateParameters(alarm) {
    const typeSplit = alarm.type.split("::");
    let parameters = {
      name: alarm.name,
      provider: typeSplit[0],
      resourceType: typeSplit[1],
      alarmType: typeSplit[2],
      resource: alarm.resource.split("::"),
      threshold: alarm.threshold,
      period: alarm.period,
      endpoint: `${config.apiUrl}/logmetric/alarm/environment/sns`,
    };
    const calc = get(predefinedEnvironmentAlarms, alarm.type.replaceAll('::', '.'));
    if (!calc) {
      return null
    }
    return calc(parameters);
}

