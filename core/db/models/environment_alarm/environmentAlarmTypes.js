const predefinedEnvironmentAlarmTypes = {
  aws: {
    ecsCluster: ['aws::ecs_cluster::high_cpu_utilization', 'aws::ecs_cluster::high_memory_utilization'],
    alb:['aws::alb::HTTPCode_ELB_5XX_Count']
  }
}

const alarmTypes = ['aws::ecs_cluster::high_cpu_utilization', 'aws::ecs_cluster::high_memory_utilization', 'aws::alb::HTTPCode_ELB_5XX_Count']


exports.alarmCategories = predefinedEnvironmentAlarmTypes;
exports.alarmTypes = alarmTypes;