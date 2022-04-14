package main

import (
	"log"

	"github.com/joho/godotenv"
	"github.com/utopiops/utopiops/access-manager/app"
	"github.com/utopiops/utopiops/access-manager/config"
)

func init() {
	log.SetFlags(log.Llongfile)
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}
	err = config.Load()
	if err != nil {
		panic(err)
	}
}

func main() {
	app := app.NewApp()
	app.Start(":" + config.Configs.App.Port)
}
