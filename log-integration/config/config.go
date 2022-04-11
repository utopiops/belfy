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
		Port           string `envconfig:"LOG_ITG_APP_PORT" default:"3000"`
		Environment    string `envconfig:"LOG_ITG_APP_ENV"`
		AllowedOrigins string `envconfig:"LOG_ITG_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"LOG_ITG_CORE_API_URL"`
		SecretManager string `envconfig:"LOG_ITG_SECRET_MGR_URL"`
		AccessManager string `envconfig:"LOG_ITG_ACCESS_MGR_URL"`
		IdsPublic     string `envconfig:"LOG_ITG_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"LOG_ITG_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"LOG_ITG_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"LOG_ITG_AUDIT_MGR_URL"`
	}

	Database struct {
		Host     string `envconfig:"LOG_ITG_DATABASE_HOST"`
		Port     int    `envconfig:"LOG_ITG_DATABASE_PORT"`
		User     string `envconfig:"LOG_ITG_DATABASE_USER"`
		Password string `envconfig:"LOG_ITG_DATABASE_PASSWORD"`
		DbName   string `envconfig:"LOG_ITG_DATABASE_DBNAME"`
		Extras   string `envconfig:"LOG_ITG_DATABASE_EXTRAS"`
		Driver   string `envconfig:"LOG_ITG_DATABASE_DRIVER" default:"postgres"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"LOG_ITG_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"LOG_ITG_APP_NAME"`
		AppSecret              string `envconfig:"LOG_ITG_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"LOG_ITG_SIMPLE_SECRET_PP"`
		NewRelicAppName        string `envconfig:"LOG_ITG_NEW_RELIC_APP_NAME"`
		NewRelicLicense        string `envconfig:"LOG_ITG_NEW_RELIC_LICENSE"`
		ClientId               string `envconfig:"LOG_ITG_CLIENT_ID"`
		ClientSecret           string `envconfig:"LOG_ITG_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
