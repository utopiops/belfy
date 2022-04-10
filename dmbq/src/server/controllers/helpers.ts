import axios from 'axios';
import config from '../utils/config';

// todo: status type should be enum
export async function updateJobStatus(jobId: string, status: string, headers: any, userDetails?: any) {
  await axios({
    method: 'put',
    url: `${config.coreUrl}/job/${jobId}/status`,
    data: {
      status,
      ...userDetails,
    },
    headers,
  });
}

// todo: update type definition
export async function initiateJob(jobConfig: any, headers: any, userDetails?: any) {
  try {
    const result = await axios({
      method: 'post',
      url: `${config.coreUrl}/job/`,
      data: { ...jobConfig, ...userDetails },
      headers,
    });
    const jobId = result.data;

    await updateJobStatus(jobId, 'processing', headers, userDetails);
    return jobId;
  } catch (error) {
    console.error('error:', error);
    return error;
  }
}
