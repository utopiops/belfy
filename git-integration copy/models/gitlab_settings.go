package models

type GitlabSettings struct {
	ID              int    `db:"id" json:"-"`
	ProjectID       string `db:"project_id"   json:"projectId"`
	IntegrationName string `db:"integration_name"   json:"integrationName"`
}