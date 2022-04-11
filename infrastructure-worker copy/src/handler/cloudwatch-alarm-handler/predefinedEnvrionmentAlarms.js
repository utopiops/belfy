const ecsClusterAlarms = {
  high_cpu_utilization: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "CPUUtilization",
    namespace: "AWS/ECS",
    statistic: "Average",
    alarmDescription: "Cluster's cpu utilization too high.",
    dimensions: [
      {
        key: 'ClusterName',
        value: params.resource[2]
      }
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  }),
  high_memory_utilization: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "MemoryUtilization",
    namespace: "AWS/ECS",
    statistic: "Average",
    alarmDescription: "Cluster's memory utilization too high.",
    dimensions: [
      {
        key: 'ClusterName',
        value: params.resource[2]
      }
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  })
};

const albAlarms = {
  HTTPCode_ELB_5XX_Count: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "HTTPCode_ELB_5XX_Count",
    namespace: "AWS/ApplicationELB",
    statistic: "Sum",
    alarmDescription: "Too many 5xx responses sent from Application Load Balancer.",
    dimensions: [
      {
        key: 'LoadBalancer',
        value: params.resource[2]
      }
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  }),
};

const predefinedEnvironmentAlarms = {
  aws: {
    ecs_cluster: ecsClusterAlarms,
    alb: albAlarms,
  }
}

module.exports = predefinedEnvironmentAlarms;
