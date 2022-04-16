const alarmTypes = {
  aws: {
    applications: {
      ecs: ['aws_app_ecs_high_cpu_util', 'aws_app_ecs_high_memory_util'],
      classic_baked: [
        'aws_app_classic_baked_high_cpu_util',
        'aws_app_classic_baked_high_memory_util',
      ],
      s3_website: ['aws_app_s3_website_high_5xxErrorRate', 'aws_app_s3_website_high_4xxErrorRate'],
    },
    environments: {
      ecs: ['aws_env_ecs_high_cpu_util', 'aws_env_ecs_high_memory_util'],
      elb: ['aws_env_HTTPCode_ELB_5XX_Count', 'aws_env_HTTPCode_ELB_4XX_Count'],
    },
  },
};

module.exports = alarmTypes;
