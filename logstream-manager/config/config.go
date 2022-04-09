package config

import (
	"github.com/kelseyhightower/envconfig"
)

type (
	Config struct {
		App       App
		Endpoints Endpoints
		Secrets   Secrets
		Database  Database
	}

	App struct {
		Port           string `envconfig:"LSM_APP_PORT" default:"3003"`
		Environment    string `envconfig:"LSM_APP_ENV"`
		AllowedOrigins string `envconfig:"LSM_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Database struct {
		Host     string `envconfig:"LSM_DATABASE_HOST"`
		Port     int    `envconfig:"LSM_DATABASE_PORT"`
		User     string `envconfig:"LSM_DATABASE_USER"`
		Password string `envconfig:"LSM_DATABASE_PASSWORD"`
		DbName   string `envconfig:"LSM_DATABASE_DBNAME"`
		Extras   string `envconfig:"LSM_DATABASE_EXTRAS"`
		Driver   string `envconfig:"LSM_DATABASE_DRIVER" default:"postgres"`
	}

	Endpoints struct {
		Core          string `envconfig:"LSM_CORE_API_URL"`
		AccessManager string `envconfig:"LSM_ACCESS_MGR_URL"`
		IdsPublic     string `envconfig:"LSM_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"LSM_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"LSM_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"LSM_AUDIT_MGR_URL"`
	}

	Secrets struct {
		AuthServerJwtSecret string `envconfig:"LSM_AUTH_SERVER_JWT_SECRET"`
		AppName             string `envconfig:"LSM_APP_NAME"`
		AppSecret           string `envconfig:"LSM_APP_SECRET"`
		NewRelicAppName     string `envconfig:"LSM_NEW_RELIC_APP_NAME"`
		NewRelicLicense     string `envconfig:"LSM_NEW_RELIC_LICENSE"`
		ClientId            string `envconfig:"LSM_CLIENT_ID"`
		ClientSecret        string `envconfig:"LSM_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
