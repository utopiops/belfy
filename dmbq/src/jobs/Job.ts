/* eslint-disable class-methods-use-this */
class Job {
  type: string;

  description: string;

  url: string;

  method: string;

  body?: any; // todo: change this to a proper type

  collection?: string;

  filter?: any; // todo: change this to a proper type

  dataBag?: any; // todo: change this to a proper type

  // ?: REMOVE THIS NONSENSE ENTIRELY!
  details: {
    // lineNumber?: number;
    jobId: string;
    name: string; // todo: rename to logPrefix
    headers: object; // todo: rename this to authHeaders
    isDynamic?: boolean;
  };

  constructor(job: Job) {
    this.type = job.type;
    this.description = job.description;
    this.url = job.url;
    this.method = job.method;
    this.body = job.body;
    this.collection = job.collection;
    this.filter = job.filter;
    this.details = job.details;
    this.dataBag = job.dataBag;
    // this.details.lineNumber = 0;
  }
}

export default Job;
