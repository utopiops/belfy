#!/bin/bash
echo "ECS_CLUSTER=${ClusterName}" >> /etc/ecs/ecs.config
echo "ECS_UPDATES_ENABLED=true" >> /etc/ecs/ecs.config
echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config
yum install -y hibagent
/usr/bin/enable-ec2-spot-hibernation