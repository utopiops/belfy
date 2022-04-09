package job_log_model

import "context"

type JobLog struct {
	JobId      string `db:"job_id"        json:"jobId"`
	LineNumber int16  `db:"line_number"   json:"lineNumber"`
	Payload    string `db:"payload"       json:"payload"`
	IsLastLine bool   `db:"is_last_line"  json:"isLastLine"`
}

type JobLogStore interface {
	// Persist a job-log entry
	Create(context.Context, *JobLog) error

	// Retrieves the logs for the job `jobId` from the line number `lineNumber`
	Retrieve(context.Context, string, int16) ([]JobLog, error)
}
