package models

type BitbucketSettings struct {
	ID              int    `db:"id" json:"-"`
	RepoFullName    string `db:"repo_full_name" json:"repoFullName"`
	IntegrationName string `db:"integration_name"   json:"integrationName"`
}
