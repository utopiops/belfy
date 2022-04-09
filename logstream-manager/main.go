package main

import (
	"fmt"
	"os"

	"gitlab.com/utopiops-water/logstream-manager/db"
	"gitlab.com/utopiops-water/logstream-manager/middlewares"
	"gitlab.com/utopiops-water/logstream-manager/models/job_log_model"
	"gitlab.com/utopiops-water/logstream-manager/stores"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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
	r.Use(middlewares.CORSMiddleware())

	// TODO: Providers to be called here
	jobLogController := jlc.JobLogController{}
	healthCheckController := hc.HealthCheckController{}
	jobLogStore := job_log_model.New(db)
	settingsStore := stores.NewSettingsStore(db)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(settingsStore))

	// Authorized routes
	r.Use(middlewares.JwtAuthorizationMiddleware())
	r.GET("/log/job", jobLogController.GetLog(jobLogStore))
	r.POST("/log/job", jobLogController.SaveLog(jobLogStore))

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
