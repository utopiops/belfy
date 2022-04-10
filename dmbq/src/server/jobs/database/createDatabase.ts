import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

async function jobPromise(details: any, body: any): Promise<object> {
  return new Job({
    type: 'create',
    description: 'database creation',
    url: `${config.coreUrl}/v3/database/environment/name/${body.environmentName}/database/rds`,
    method: 'POST',
    body: {
      initial_db_name: body.initial_db_name,
      name: body.name,
      allocated_storage: body.allocated_storage,
      family: body.family,
      engine: body.engine,
      engine_version: body.engine_version,
      instance_class: body.instance_class,
      username: body.username,
      password: body.password,
      port: body.port,
      multi_az: body.multi_az,
      storage_type: body.storage_type,
      iops: body.iops,
      publicly_accessible: body.publicly_accessible,
      allow_major_version_upgrade: body.allow_major_version_upgrade,
      auto_minor_version_upgrade: body.auto_minor_version_upgrade,
      apply_immediately: body.apply_immediately,
      maintenance_window: body.maintenance_window,
      backup_retention_period: body.backup_retention_period,
      backup_window: body.backup_window,
      tags: body.tags,
      description: body.description,
    },
    collection: 'database_server_v2',
    filter: {
      name: body.name,
      environment: await getEnvironmentId(details.accountId, body.environmentName), // todo: move this to somewhere more accessible
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.name,
    },
  });
}

export default jobPromise;
