package main

import (
	"fmt"
	"log"
	"os"

	"gitlab.com/utopiops-water/secret-manager/shared"

	"gitlab.com/utopiops-water/secret-manager/controllers/health"
	"gitlab.com/utopiops-water/secret-manager/controllers/simplesecret"
	"gitlab.com/utopiops-water/secret-manager/db"
	"gitlab.com/utopiops-water/secret-manager/stores"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/newrelic/go-agent/v3/integrations/nrgin"
	"github.com/newrelic/go-agent/v3/newrelic"
	"gitlab.com/utopiops-water/framework/middlewares"
	"gitlab.com/utopiops-water/secret-manager/config"
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
	simpleSecretStore := stores.New(db)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(simpleSecretStore))

	// r.Use(middlewares.JwtAuthorizationMiddleware())
	r.Use(tempIdsMiddleware.IdsAuthorizationMiddleware())

	// TODO: Providers to be called here
	simpleSecretController := simplesecret.SimpleSecretController{}

	// Routes
	r.POST("/simple",
		auditMiddleware.Audit("Create secret"), simpleSecretController.CreateSimpleSecret(simpleSecretStore))
	r.POST("/simple/array/value",
		auditMiddleware.Audit("Get secret values (array)"), simpleSecretController.GetSimpleSecretArrayMode(simpleSecretStore))
	r.GET("/simple",
		auditMiddleware.Audit("Get all secret names"), simpleSecretController.ListSimpleSecrets(simpleSecretStore))
	r.GET("/simple/:name",
		auditMiddleware.Audit("Get secret (name and value)"), simpleSecretController.GetSimpleSecret(simpleSecretStore))
	r.GET("/simple/:name/value",
		auditMiddleware.Audit("Get secret value"), simpleSecretController.GetSimpleSecretValue(simpleSecretStore))
	r.GET("/simple/:name/value/accountId/:accountId",
		auditMiddleware.Audit("Get secret value (internal use case)"), simpleSecretController.GetSimpleSecretValueForInternal(simpleSecretStore))
	r.DELETE("/simple/:name",
		auditMiddleware.Audit("Delete secret"), simpleSecretController.DeleteSimpleSecret(simpleSecretStore))

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
