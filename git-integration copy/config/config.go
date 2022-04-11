package config

import (
	"github.com/kelseyhightower/envconfig"
)

type (
	Config struct {
		App       App
		Database  Database
		Redis     Redis
		Secrets   Secrets
		Endpoints Endpoints
	}

	App struct {
		Port           string `envconfig:"GIT_ITG_APP_PORT" default:"3000"`
		Environment    string `envconfig:"GIT_ITG_APP_ENV"`
		AllowedOrigins string `envconfig:"GIT_ITG_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core              string `envconfig:"GIT_ITG_CORE_API_URL"`
		SecretManager     string `envconfig:"GIT_ITG_SECRET_MGR_URL"`
		AccessManager     string `envconfig:"GIT_ITG_ACCESS_MGR_URL"`
		IdsPublic         string `envconfig:"GIT_ITG_IDS_PUBLIC_URL"`
		IdsAdmin          string `envconfig:"GIT_ITG_IDS_ADMIN_URL"`
		IdsJwks           string `envconfig:"GIT_ITG_IDS_JWKS_URL"`
		AuditManager      string `envconfig:"GIT_ITG_AUDIT_MGR_URL"`
		GithubTokenUrl    string `envconfig:"GIT_ITG_GITHUB_OAUTH_TOKEN_URL"`
		GitlabTokenUrl    string `envconfig:"GIT_ITG_GITLAB_OAUTH_TOKEN_URL"`
		GitlabRedirectUrl string `envconfig:"GIT_ITG_GITLAB_OAUTH_REDIRECT_URL"`
		GitlabWebhookUrl  string `envconfig:"GIT_ITG_GITLAB_WEBHOOK_URL"`
		BitbucketTokenUrl string `envconfig:"GIT_ITG_BITBUCKET_OAUTH_TOKEN_URL"`
	}

	Database struct {
		Host     string `envconfig:"GIT_ITG_DATABASE_HOST"`
		Port     int    `envconfig:"GIT_ITG_DATABASE_PORT"`
		User     string `envconfig:"GIT_ITG_DATABASE_USER"`
		Password string `envconfig:"GIT_ITG_DATABASE_PASSWORD"`
		DbName   string `envconfig:"GIT_ITG_DATABASE_DBNAME"`
		Extras   string `envconfig:"GIT_ITG_DATABASE_EXTRAS"`
		Driver   string `envconfig:"GIT_ITG_DATABASE_DRIVER" default:"postgres"`
	}

	Redis struct {
		Host string `envconfig:"GIT_ITG_REDIS_HOST"`
		Port int    `envconfig:"GIT_ITG_REDIS_PORT"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"GIT_ITG_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"GIT_ITG_APP_NAME"`
		AppSecret              string `envconfig:"GIT_ITG_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"GIT_ITG_SIMPLE_SECRET_PP"`
		NewRelicAppName        string `envconfig:"GIT_ITG_NEW_RELIC_APP_NAME"`
		NewRelicLicense        string `envconfig:"GIT_ITG_NEW_RELIC_LICENSE"`
		ClientId               string `envconfig:"GIT_ITG_CLIENT_ID"`
		ClientSecret           string `envconfig:"GIT_ITG_CLIENT_SECRET"`
		GithubClientId         string `envconfig:"GIT_ITG_GITHUB_CLIENT_ID"`
		GithubClientSecret     string `envconfig:"GIT_ITG_GITHUB_CLIENT_SECRET"`
		GitlabClientId         string `envconfig:"GIT_ITG_GITLAB_CLIENT_ID"`
		GitlabClientSecret     string `envconfig:"GIT_ITG_GITLAB_CLIENT_SECRET"`
		GitlabWebhookSecret    string `envconfig:"GIT_ITG_GITLAB_WEBHOOK_SECRET"`
		BitbucketClientId      string `envconfig:"GIT_ITG_BITBUCKET_CLIENT_ID"`
		BitbucketClientSecret  string `envconfig:"GIT_ITG_BITBUCKET_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
