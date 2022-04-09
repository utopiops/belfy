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
		Port           string `envconfig:"GIT_ITG_APP_PORT" default:"3000"`
		Environment    string `envconfig:"GIT_ITG_APP_ENV"`
		AllowedOrigins string `envconfig:"GIT_ITG_APP_ALLOWED_ORIGINS" default:"*"`
	}

	Endpoints struct {
		Core          string `envconfig:"GIT_ITG_CORE_API_URL"`
		SecretManager string `envconfig:"GIT_ITG_SECRET_MGR_URL"`
		AccessManager string `envconfig:"GIT_ITG_ACCESS_MGR_URL"`
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

	Secrets struct {
		AuthServerJwtSecret    string `envconfig:"GIT_ITG_AUTH_SERVER_JWT_SECRET"`
		AppName                string `envconfig:"GIT_ITG_APP_NAME"`
		AppSecret              string `envconfig:"GIT_ITG_APP_SECRET"`
		SimpleSecretPassPhrase string `envconfig:"GIT_ITG_SIMPLE_SECRET_PP"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
