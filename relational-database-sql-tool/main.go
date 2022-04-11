package main

import (
	"fmt"
	"log"
	"os"

	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"

	"gitlab.com/utopiops-water/framework/middlewares"
	frameworkModels "gitlab.com/utopiops-water/framework/models"
	"gitlab.com/utopiops-water/relational-database-sql-tool/controllers/health"
	"gitlab.com/utopiops-water/relational-database-sql-tool/controllers/rds"
	"gitlab.com/utopiops-water/relational-database-sql-tool/controllers/settings"
	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"

	"github.com/dgraph-io/ristretto"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/newrelic/go-agent/v3/integrations/nrgin"
	"github.com/newrelic/go-agent/v3/newrelic"
	"gitlab.com/utopiops-water/relational-database-sql-tool/config"
)

func init() {
	log.SetFlags(log.Llongfile)
}

// @title Relational Database Sql Tool API
// @version 1.0.0
// @description This is the relational-database-sql-tool API Documentation.

// @contact.name Utopiops
// @contact.url http://www.utopiops.com
// @contact.email contactus@utopiops.com

// @license.name Copyright (C) Utopiops

func main() {

	err := bootstrap()
	if err != nil {
		os.Exit(1)
	}

	// Initialize databae
	db, err := initializeDB()
	shared.FailOnError(err, "Database initialization failed, exiting the app with error!")

	// Set up cache
	cache, err := setupCache()
	shared.FailOnError(err, "Cache setup failed, exiting the app with error!")

	gin.ForceConsoleColor()
	r := gin.Default()

	// Middlewares
	middlewares.SetAppName(config.Configs.Secrets.AppName)
	middlewares.SetAccessManagerUrl(config.Configs.Endpoints.AccessManager)
	tempIdsMiddleware := middlewares.NewTempIdsMiddleware(
		config.Configs.Endpoints.IdsPublic,
		config.Configs.Endpoints.IdsAdmin,
		config.Configs.Endpoints.IdsJwks,
		config.Configs.Secrets.AuthServerJwtSecret,
	)

	auditMiddleware := middlewares.NewAuditMiddleware(
		config.Configs.Endpoints.AuditManager,
		config.Configs.Secrets.AppName,
		config.Configs.Endpoints.IdsPublic,
		config.Configs.Secrets.ClientId, config.Configs.Secrets.ClientSecret,
	)

	// New Relic gin middleware (https://pkg.go.dev/github.com/newrelic/go-agent/v3/integrations/nrgin#section-readme)
	newRelicApp, err := newrelic.NewApplication(
		newrelic.ConfigAppName(config.Configs.Secrets.NewRelicAppName),
		newrelic.ConfigLicense(config.Configs.Secrets.NewRelicLicense),
		newrelic.ConfigDistributedTracerEnabled(true),
	)
	if err == nil {
		r.Use(nrgin.Middleware(newRelicApp))
	}

	r.Use(middlewares.CORSMiddleware(config.Configs.App.AllowedOrigins))

	healthCheckController := health.HealthCheckController{}
	settingsStore := stores.NewSettingsStore(db)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(settingsStore))

	// r.Use(middlewares.JwtAuthorizationMiddleware())
	r.Use(tempIdsMiddleware.IdsAuthorizationMiddleware())

	// TODO: Providers to be called here
	settingsController := settings.SettingsController{}
	RDSController := rds.RDSController{Cache: cache}
	httpHelper := shared.NewHttpHelper(shared.NewHttpClient())

	// Routes
	type ar = frameworkModels.AuthorizeResource
	r.GET("/settings/environment/name/:env_name/database/name/:db_name/enabled",
		auditMiddleware.Audit("Get database settings status"),
		middlewares.Authorize("env/database/enable", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), settingsController.IsEnabled(settingsStore))

	r.POST("/rds/environment/name/:env_name/database/name/:db_name/list_db",
		auditMiddleware.Audit("Get databases list"),
		middlewares.Authorize("env/database/list", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), RDSController.GetDatabaseList(httpHelper, settingsStore))

	r.POST("/rds/environment/name/:env_name/database/name/:db_name/list_table",
		auditMiddleware.Audit("Get tables list"),
		middlewares.Authorize("env/database/table", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), RDSController.GetTableList(httpHelper, settingsStore))

	r.POST("/rds/environment/name/:env_name/database/name/:db_name/get_table_rows",
		auditMiddleware.Audit("Get top rows of table"),
		middlewares.Authorize("env/database/rows", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), RDSController.GetTableRows(httpHelper, settingsStore))

	r.POST("/rds/environment/name/:env_name/database/name/:db_name/settings",
		auditMiddleware.Audit("Set database settings"),
		middlewares.Authorize("env/database", "set", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), RDSController.SetDatabaseSettings(httpHelper, settingsStore))

	// r.GET("/rds/environment/name/:env_name/database/name/:db_name/logs/live", RDSController.GetLiveLogs(httpHelper, settingsStore))
	r.POST("/rds/environment/name/:env_name/database/name/:db_name/query",
		auditMiddleware.Audit("Execute database query"),
		middlewares.Authorize("env/database/query", "execute", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "db_name"}), RDSController.ExecuteUserQuery(httpHelper, settingsStore))

	// swagger
	// swagUrl := ginSwagger.URL("*/swagger/doc.json") // The url pointing to API definition
	// docs.SwaggerInfo.BasePath = "/api/v1"
	// r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	r.Run(":" + config.Configs.App.Port)
}

func bootstrap() error {
	err := godotenv.Load()
	if err != nil {
		return err
	}

	err = config.Load()
	if err != nil {
		return err
	}
	log.Println("Environment variables loaded...")
	return nil
}

func initializeDB() (*db.DB, error) {

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
	db, err := db.Connect(driver, connStr)
	return db, err
}

func setupCache() (cache *ristretto.Cache, err error) {
	cache, err = ristretto.NewCache(&ristretto.Config{
		NumCounters: 1e7,     // number of keys to track frequency of (10M).
		MaxCost:     1 << 30, // maximum cost of cache (1GB).
		BufferItems: 64,      // number of keys per Get buffer.
	})
	return
}
