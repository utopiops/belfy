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
		Port           string `envconfig:"RDST_APP_PORT" default:"3000"`
		Environment    string `envconfig:"RDST_APP_ENV"`
		AllowedOrigins string `envconfig:"RDST_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"RDST_CORE_API_URL"`
		SecretManager string `envconfig:"RDST_SECRET_MGR_URL"`
		AccessManager string `envconfig:"RDST_ACCESS_MGR_URL"`
		IdsPublic     string `envconfig:"RDST_IDS_PUBLIC_URL"`
		IdsAdmin      string `envconfig:"RDST_IDS_ADMIN_URL"`
		IdsJwks       string `envconfig:"RDST_IDS_JWKS_URL"`
		AuditManager  string `envconfig:"RDST_AUDIT_MGR_URL"`
	}

	Database struct {
		Host     string `envconfig:"RDST_DATABASE_HOST"`
		Port     int    `envconfig:"RDST_DATABASE_PORT"`
		User     string `envconfig:"RDST_DATABASE_USER"`
		Password string `envconfig:"RDST_DATABASE_PASSWORD"`
		DbName   string `envconfig:"RDST_DATABASE_DBNAME"`
		Extras   string `envconfig:"RDST_DATABASE_EXTRAS"`
		Driver   string `envconfig:"RDST_DATABASE_DRIVER" default:"postgres"`
	}

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"RDST_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"RDST_APP_NAME"`
		AppSecret              string `envconfig:"RDST_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"RDST_SIMPLE_SECRET_PP"`
		NewRelicAppName        string `envconfig:"RDST_NEW_RELIC_APP_NAME"`
		NewRelicLicense        string `envconfig:"RDST_NEW_RELIC_LICENSE"`
		ClientId               string `envconfig:"RDST_CLIENT_ID"`
		ClientSecret           string `envconfig:"RDST_CLIENT_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
