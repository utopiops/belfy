// Note: always keep these two in sync

const predefinedApplicationAlarmTypes = {
  aws: {
    ecs: ['aws::ecs::high_cpu_utilization', 'aws::ecs::high_memory_utilization'],
    classic_baked: ['aws::classic_baked::high_cpu_utilization', 'aws::classic_baked::high_memory_utilization'],
    s3_website: ['aws::s3_website::high_5xxErrorRate', 'aws::s3_website::high_4xxErrorRate']
  }
}

const alarmTypes = ['aws::ecs::high_cpu_utilization', 'aws::ecs::high_memory_utilization', 'aws::classic_baked::high_cpu_utilization', 'aws::classic_baked::high_memory_utilization', 'aws::s3_website::high_5xxErrorRate', 'aws::s3_website::high_4xxErrorRate']


exports.alarmCategories = predefinedApplicationAlarmTypes;
exports.alarmTypes = alarmTypes;
