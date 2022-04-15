package config

import (
	"github.com/kelseyhightower/envconfig"
)

type (
	Config struct {
		App       App
		Secrets   Secrets
		Endpoints Endpoints
		Database  Database
		Store     Store
	}
	App struct {
		Port           string `envconfig:"PM_APP_PORT" default:"3000"`
		Environment    string `envconfig:"PM_APP_ENV"`
		AllowedOrigins string `envconfig:"PM_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"PM_CORE_URL"`
		SecretManager string `envconfig:"PM_SECRET_MGR_URL"`
		IdsPublic     string `envconfig:"PM_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"PM_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"PM_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"PM_AUDIT_MANAGER_URL"`
		Accounting    string `envconfig:"PM_ACCOUNTING_URL"`
	}

	Database struct {
		Host     string `envconfig:"PM_DATABASE_HOST"`
		Port     int    `envconfig:"PM_DATABASE_PORT"`
		User     string `envconfig:"PM_DATABASE_USER"`
		Password string `envconfig:"PM_DATABASE_PASSWORD"`
		DbName   string `envconfig:"PM_DATABASE_DBNAME"`
		Extras   string `envconfig:"PM_DATABASE_EXTRAS"`
		Driver   string `envconfig:"PM_DATABASE_DRIVER" default:"postgres"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"PM_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"PM_APP_NAME"`
		AppSecret              string `envconfig:"PM_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"PM_SIMPLE_SECRET_PP"`
		ClientId               string `envconfig:"PM_CLIENT_ID"`
		ClientSecret           string `envconfig:"PM_CLIENT_SECRET"`
	}

	Store struct {
		Plans string `envconfig:"PM_PLANS_PATH"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
