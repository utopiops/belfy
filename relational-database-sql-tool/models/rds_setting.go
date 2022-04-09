package models

type RDSSetting struct {
	ID              int    `db:"id"`
	DatabaseID      int    `db:"database_id"`
	AccountID       string `json:"accountId" db:"account_id"`
	EnvironmentName string `json:"environmentName" db:"environment_name"`
	DatabaseName    string `json:"databaseName" db:"database_name"`
	Region          string `json:"region" db:"region"`
	Kind            string `json:"databaseKind" db:"database_kind"`
	DNS             string `json:"dns" db:"dns"`
	LambdaName      string `json:"lambdaName" db:"lambda_name"`
	Engine          string `json:"databaseEngine" db:"database_engine"`
}
