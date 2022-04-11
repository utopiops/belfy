const path = require('path');
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const handlebars = require('handlebars');
const config = require('../../config');
const predefinedApplicationAlarms = require('./predefinedApplicationAlarms');
const { get } = require('lodash');

exports.renderTerraform = async (rootFolderPath, environment, user, providerBucketName, providerRegion, alarm) => {
    // Note: unlike other components like applications, here we take a different approach and don't create a module and indeed we just directly copy the 
    // rendered file (from handlebars) into a file in the root folder path.
    console.log(`alarm:::`, alarm);
    const params = calculateParameters(alarm);
    if (params === null) {
      throw new Error("invalid alarm");
    }
    // Copy the ECS service module to the user folder
    var cloudwatchAlarmModulePath = './terraform-modules/aws/cloudwatch-alarm/';
    await fileHelper.copyFolder(cloudwatchAlarmModulePath, rootFolderPath);

    const td = await fileHelper.readFile(`${rootFolderPath}/alarm.handlebars`);
    const tdTemplate = handlebars.compile(td);
    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, tdTemplate(params));

};


function calculateParameters(alarm) {
    const typeSplit = alarm.type.split("::");
    let parameters = {
      name: alarm.name,
      provider: typeSplit[0],
      applicationType: typeSplit[1],
      alarmType: typeSplit[2],
      dimensions: alarm.extras.dimensions,
      threshold: alarm.threshold,
      period: alarm.period,
      endpoint: `${config.apiUrl}/logmetric/alarm/environment/sns`,
    };
    const calc = get(predefinedApplicationAlarms, alarm.type.replace(/::/g, '.'));
    if (!calc) {
      return null
    }
    return calc(parameters);
}

