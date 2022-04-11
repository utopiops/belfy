package main

import (
	"fmt"
	"log"
	"os"

	"gitlab.com/utopiops-water/log-integration/shared"

	"gitlab.com/utopiops-water/framework/middlewares"
	frameworkModels "gitlab.com/utopiops-water/framework/models"
	"gitlab.com/utopiops-water/log-integration/controllers/cloudwatch"
	"gitlab.com/utopiops-water/log-integration/controllers/health"
	"gitlab.com/utopiops-water/log-integration/controllers/settings"
	"gitlab.com/utopiops-water/log-integration/db"
	"gitlab.com/utopiops-water/log-integration/stores"

	"github.com/dgraph-io/ristretto"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/newrelic/go-agent/v3/integrations/nrgin"
	"github.com/newrelic/go-agent/v3/newrelic"
	"gitlab.com/utopiops-water/log-integration/config"
)

func init() {
	log.SetFlags(log.Llongfile)
}

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

	// Routes
	r.GET("/health", healthCheckController.GetStatus(db))

	// r.Use(middlewares.JwtAuthorizationMiddleware())
	r.Use(tempIdsMiddleware.IdsAuthorizationMiddleware())

	// TODO: Providers to be called here
	settingsController := settings.SettingsController{}
	cloudwatchController := cloudwatch.CloudwatchController{Cache: cache}
	settingsStore := stores.NewSettingsStore(db)
	httpHelper := shared.NewHttpHelper(shared.NewHttpClient())

	// AuthorizeResource is a struct to define type and key to get value from request which needs to be a part of resource
	type ar = frameworkModels.AuthorizeResource

	// Routes
	r.GET("/settings/environment/name/:env_name/application/name/:app_Name/service/name",
		auditMiddleware.Audit("Get service name"),
		middlewares.Authorize("env/application", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), settingsController.GetServiceName(settingsStore))

	r.POST("/cloudwatch/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Set cloudwatch application settings"),
		middlewares.Authorize("env/application", "set", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), cloudwatchController.SetApplicationSettings(settingsStore))

	r.GET("/cloudwatch/environment/name/:env_name/application/name/:app_Name/logs/live",
		auditMiddleware.Audit("Get cloudwatch live logs"),
		middlewares.Authorize("env/application/logs", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), cloudwatchController.GetLiveLogs(httpHelper, settingsStore))

	r.POST("/cloudwatch/environment/name/:env_name/application/name/:app_Name/logs/query",
		auditMiddleware.Audit("Run cloudwatch log query"),
		middlewares.Authorize("env/application/query", "run", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), cloudwatchController.RunInsightsQuery(httpHelper, settingsStore))

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
