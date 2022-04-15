package utils

import (
	"fmt"

	"github.com/utopiops/utopiops/plan-manager/config"
)

func DbConnStr() (string, string) {
	host := config.Configs.Database.Host
	port := config.Configs.Database.Port
	user := config.Configs.Database.User
	password := config.Configs.Database.Password
	dbName := config.Configs.Database.DbName
	extras := config.Configs.Database.Extras
	driver := config.Configs.Database.Driver
	connStr := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s %s",
		host, port, user, password, dbName, extras)
	return driver, connStr
}
