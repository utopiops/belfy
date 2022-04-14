package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/utopiops/utopiops/plan-manager/app"
	"github.com/utopiops/utopiops/plan-manager/config"
	"github.com/utopiops/utopiops/plan-manager/controllers/healthcheck"
	"github.com/utopiops/utopiops/plan-manager/controllers/usageController"
)

func init() {
	log.SetFlags(log.Llongfile)
	err := godotenv.Load()
	if err != nil {
		log.Println(err)
		panic(err)
	}
	err = config.Load()
	if err != nil {
		panic(err)
	}
}

func main() {
	healthController := healthcheck.New()
	usageController := usageController.New()
	app := app.New(healthController, usageController)
	log.Println(app.Start(":" + config.Configs.App.Port))
}
