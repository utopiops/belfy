package stores

import (
	"context"
	"time"

	"github.com/go-redis/redis"
	"gitlab.com/utopiops-water/git-integration/db"
	"gitlab.com/utopiops-water/git-integration/models"
)

func NewSettingsStore(db *db.DB, redisClient *redis.Client) SettingsStore {
	return &settingsStore{db, redisClient}
}

type SettingsStore interface {
	// Store a simple secret
	GetServiceName(ctx context.Context, accountID, environmentName, applicationName string) (name string, err error)

	// gitlab
	SetGitlabApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, projectID string) (err error)
	DeleteGitlabApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (err error)
	UpdateGitlabApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, projectID string) (err error)
	GetGitlabSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.GitlabSettings, err error)
	// github
	SetGithubApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error)
	DeleteGithubApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (err error)
	UpdateGithubApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error)
	GetGithubSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.GithubSettings, err error)
	// bitbucket
	SetBitbucketApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error)
	DeleteBitbucketApplicationSettings(ctx context.Context, accountID, environmentName, applicationName string) (err error)
	UpdateBitbucketApplicationSettings(ctx context.Context, accountID, environmentName, applicationName, integrationName, repoFullName string) (err error)
	GetBitbucketSettings(ctx context.Context, accountID, environmentName, applicationName string) (setting *models.BitbucketSettings, err error)

	// GetMigrationHistoryRows retrieves rows of migration_history table
	GetMigrationHistoryRows() ([]string, error)

	// IsCreated checks that a table is really created or not
	IsCreated(table string) (created bool, err error)

	// GetRedisPairValue checks that a value exist for key and if exist returnes value of it
	GetRedisPairValue(key string) (exist bool, value string, err error)
	SetRedisPair(key, value string, ttl time.Duration) (err error)
}

type settingsStore struct {
	db          *db.DB
	redisClient *redis.Client
}
