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
		Core string `envconfig:"LSM_CORE_API_URL"`
	}

	Secrets struct {
		AuthServerJwtSecret string `envconfig:"LSM_AUTH_SERVER_JWT_SECRET"`
		AppName             string `envconfig:"LSM_APP_NAME"`
		AppSecret           string `envconfig:"LSM_APP_SECRET"`
	}
)

var Configs Config

func Load() error {
	err := envconfig.Process("", &Configs)
	return err
}
