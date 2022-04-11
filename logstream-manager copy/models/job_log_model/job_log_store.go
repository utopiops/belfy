package job_log_model

import (
	"context"

	"gitlab.com/utopiops-water/logstream-manager/db"
)

func New(db *db.DB) JobLogStore {
	return &jobLogStore{db}
}

type jobLogStore struct {
	db *db.DB
}

// Persist a job-log entry
func (j *jobLogStore) Create(ctx context.Context, jobLog *JobLog) error {
	// In the future we can use different statements based on the db.Driver as per DB Engine
	var statement string
	switch j.db.Driver {
	case db.Postgres:
		statement = create_psql
	}

	_, err := j.db.Connection.Exec(statement, jobLog.JobId, jobLog.LineNumber, jobLog.Payload, jobLog.IsLastLine)
	return err
}

func (j *jobLogStore) Retrieve(ctx context.Context, jobId string, fromLine int16) ([]JobLog, error) {

	var statement string
	switch j.db.Driver {
	case db.Postgres:
		statement = select_psql
	}
	var jobLogs []JobLog
	err := j.db.Connection.Select(&jobLogs, statement, jobId, fromLine)
	return jobLogs, err
}

const create_psql = `
INSERT INTO logs(
job_id, line_number, payload, is_last_line)
VALUES ($1, $2, $3, $4);
`

const select_psql = `
SELECT job_id, line_number, payload, is_last_line FROM logs 
WHERE  job_id = $1 AND
			 line_number >= $2
ORDER BY line_number ASC
`
