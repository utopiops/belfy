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
		Port           string `envconfig:"AM_APP_PORT" default:"3000"`
		Environment    string `envconfig:"AM_APP_ENV"`
		AllowedOrigins string `envconfig:"AM_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"AM_CORE_API_URL"`
		AccessManager string `envconfig:"AM_ACCESS_MANAGER_URL"`
		IdsPublic     string `envconfig:"AM_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"AM_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"AM_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"AM_AUDIT_MANAGER_URL"`
	}

	Database struct {
		Host     string `envconfig:"AM_DATABASE_HOST"`
		Port     int    `envconfig:"AM_DATABASE_PORT"`
		User     string `envconfig:"AM_DATABASE_USER"`
		Password string `envconfig:"AM_DATABASE_PASSWORD"`
		DbName   string `envconfig:"AM_DATABASE_DBNAME"`
		Extras   string `envconfig:"AM_DATABASE_EXTRAS"`
		Driver   string `envconfig:"AM_DATABASE_DRIVER" default:"postgres"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"AM_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"AM_APP_NAME"`
		AppSecret              string `envconfig:"AM_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"AM_SIMPLE_SECRET_PP"`
		ClientId               string `envconfig:"AM_CLIENT_ID"`
		ClientSecret           string `envconfig:"AM_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
