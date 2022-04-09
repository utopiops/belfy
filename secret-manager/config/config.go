package config

import "github.com/kelseyhightower/envconfig"

type (
	Config struct {
		App       App
		Database  Database
		Secrets   Secrets
		Endpoints Endpoints
	}

	App struct {
		Port           string `envconfig:"SM_APP_PORT" default:"3000"`
		Environment    string `envconfig:"SM_APP_ENV"`
		AllowedOrigins string `envconfig:"SM_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"SM_CORE_API_URL"`
		AccessManager string `envconfig:"SM_ACCESS_MGR_URL"`
		IdsPublic     string `envconfig:"SM_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"SM_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"SM_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"SM_AUDIT_MGR_URL"`
	}

	Database struct {
		Host     string `envconfig:"SM_DATABASE_HOST"`
		Port     int    `envconfig:"SM_DATABASE_PORT"`
		User     string `envconfig:"SM_DATABASE_USER"`
		Password string `envconfig:"SM_DATABASE_PASSWORD"`
		DbName   string `envconfig:"SM_DATABASE_DBNAME"`
		Extras   string `envconfig:"SM_DATABASE_EXTRAS"`
		Driver   string `envconfig:"SM_DATABASE_DRIVER" default:"postgres"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"SM_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"SM_APP_NAME"`
		AppSecret              string `envconfig:"SM_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"SM_SIMPLE_SECRET_PP"`
		NewRelicAppName        string `envconfig:"SM_NEW_RELIC_APP_NAME"`
		NewRelicLicense        string `envconfig:"SM_NEW_RELIC_LICENSE"`
		ClientId               string `envconfig:"SM_CLIENT_ID"`
		ClientSecret           string `envconfig:"SM_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
