
const ecsAlarms = {
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
        value: params.dimensions.ClusterName
      },
      {
        key: 'ServiceName',
        value: params.dimensions.ServiceName
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
        value: params.dimensions.ClusterName
      },
      {
        key: 'ServiceName',
        value: params.dimensions.ServiceName
      }
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  })
};

const classicBakedAlarms = {
  high_cpu_utilization: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    statistic: "Average",
    alarmDescription: "Instance group's cpu utilization too high.",
    dimensions: [
      {
        key: 'AutoScalingGroupName',
        value: params.dimensions.AutoScalingGroupName
      },
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
    namespace: "AWS/EC2",
    statistic: "Average",
    alarmDescription: "Instance group's memory utilization too high.",
    dimensions: [
      {
        key: 'AutoScalingGroupName',
        value: params.dimensions.AutoScalingGroupName
      },
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  }),
};

const s3WebsiteAlarms = {
  high_5xxErrorRate: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "5xxErrorRate",
    namespace: "AWS/CloudFront",
    statistic: "Average",
    alarmDescription: "Too many 5xx responses.",
    dimensions: [
      {
        key: 'DistributionId',
        value: params.dimensions.DistributionId
      },
      {
        key: 'Region',
        value: params.dimensions.Region
      },
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  }),
  high_4xxErrorRate: (params) => ({
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    evaluationPeriods: "2",
    metricName: "4xxErrorRate",
    namespace: "AWS/CloudFront",
    statistic: "Average",
    alarmDescription: "Too many 4xx responses.",
    dimensions: [
      {
        key: 'DistributionId',
        value: params.dimensions.DistributionId
      },
      {
        key: 'Region',
        value: params.dimensions.Region
      },
    ],
    period: params.period,
    threshold: params.threshold,
    endpoint: params.endpoint,
    alarmName: params.name
  }),
}


const predefinedApplicationAlarms = {
  aws: {
    ecs: ecsAlarms,
    classic_baked: classicBakedAlarms,
    s3_website: s3WebsiteAlarms
  }
};



module.exports = predefinedApplicationAlarms;
