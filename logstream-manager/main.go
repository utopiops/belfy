package main

import (
	"fmt"
	"os"

	"gitlab.com/utopiops-water/logstream-manager/db"
	"gitlab.com/utopiops-water/logstream-manager/models/job_log_model"
	"gitlab.com/utopiops-water/logstream-manager/stores"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/newrelic/go-agent/v3/integrations/nrgin"
	"github.com/newrelic/go-agent/v3/newrelic"
	"gitlab.com/utopiops-water/framework/middlewares"
	"gitlab.com/utopiops-water/logstream-manager/config"
	hc "gitlab.com/utopiops-water/logstream-manager/controllers/health"
	jlc "gitlab.com/utopiops-water/logstream-manager/controllers/job_log_controller"
	"gitlab.com/utopiops-water/logstream-manager/utils"
)

func main() {

	err := bootstrap()
	if err != nil {
		os.Exit(1)
	}

	// Initialize databae
	db, err := initializeDB()
	if err != nil {
		fmt.Println(err.Error())
		fmt.Println("Database initialization failed, exiting the app with error!")
		os.Exit(1)
	}

	// Register the app with the auth api
	authTokenHelper := utils.AuthTokenHelper{}
	err = authTokenHelper.Register()
	if err != nil {
		fmt.Println("Registration failed, exiting the app with error!")
		os.Exit(1)
	}

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

	// TODO: Providers to be called here
	jobLogController := jlc.JobLogController{}
	healthCheckController := hc.HealthCheckController{}
	jobLogStore := job_log_model.New(db)
	settingsStore := stores.NewSettingsStore(db)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(settingsStore))

	// Authorized routes
	// r.Use(middlewares.JwtAuthorizationMiddleware())
	r.Use(tempIdsMiddleware.IdsAuthorizationMiddleware())

	r.GET("/log/job",
		auditMiddleware.Audit("Get logs of job"), jobLogController.GetLog(jobLogStore))
	r.POST("/log/job",
		auditMiddleware.Audit("Save logs of job"), jobLogController.SaveLog(jobLogStore))

	r.Run(":" + config.Configs.App.Port)
}

func bootstrap() error {
	godotenv.Load() // Assuming .env file exists in the root directory
	err := config.Load()
	if err != nil {
		return err
	}
	fmt.Println("Environment variables loaded...")
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
