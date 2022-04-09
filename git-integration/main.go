package main

import (
	"fmt"
	"log"

	"gitlab.com/utopiops-water/git-integration/shared"

	"gitlab.com/utopiops-water/git-integration/controllers/bitbucket"
	"gitlab.com/utopiops-water/git-integration/controllers/github"
	"gitlab.com/utopiops-water/git-integration/controllers/gitlab"
	"gitlab.com/utopiops-water/git-integration/controllers/health"
	"gitlab.com/utopiops-water/git-integration/controllers/settings"
	"gitlab.com/utopiops-water/git-integration/db"
	"gitlab.com/utopiops-water/git-integration/stores"

	"github.com/dgraph-io/ristretto"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gitlab.com/utopiops-water/framework/middlewares"
	frameworkModels "gitlab.com/utopiops-water/framework/models"
	"gitlab.com/utopiops-water/git-integration/config"

	_ "gitlab.com/utopiops-water/git-integration/docs"
)

func init() {
	log.SetFlags(log.Llongfile)
}

// @title Git Integration API
// @version 1.0.0
// @description This is the git integration API Documentation.

// @contact.name Utopiops
// @contact.url http://www.utopiops.com
// @contact.email contact@utopiops.com

// @license.name Copyright (C) Utopiops

func main() {
	err := bootstrap()
	if err != nil {
		//os.Exit(1)
		log.Fatal(err)
	}
	// TODO: uncomment this line
	// Initialize databae
	db, err := initializeDB()
	shared.FailOnError(err, "Database initialization failed, exiting the app with error!")
	//var db *db.DB
	// Set up cache
	cache, err := setupCache()
	shared.FailOnError(err, "Cache setup failed, exiting the app with error!")

	gin.ForceConsoleColor()
	r := gin.Default()

	// Middlewares
	middlewares.SetAuthServerJwtSecret(config.Configs.Secrets.AuthServerJwtSecret)
	middlewares.SetAppName(config.Configs.Secrets.AppName)
	r.Use(middlewares.CORSMiddleware(config.Configs.App.AllowedOrigins))

	healthCheckController := health.HealthCheckController{}
	settingsStore := stores.NewSettingsStore(db)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(settingsStore))

	// TODO: uncomment this line
	r.Use(middlewares.JwtAuthorizationMiddleware())

	// TODO: Providers to be called here
	settingsController := settings.SettingsController{}
	gitlabController := gitlab.GitlabController{Cache: cache}
	githubController := github.GithubController{Cache: cache}
	bitbucketController := bitbucket.BitbucketController{Cache: cache}
	httpHelper := shared.NewHttpHelper(shared.NewHttpClient())
	// AuthorizeResource is a struct to define type and key to get value from request which needs to be a part of resource
	type ar = frameworkModels.AuthorizeResource

	// Routes
	r.GET("/settings/environment/name/:env_name/application/name/:app_Name/service/name", settingsController.GetServiceName(settingsStore))

	// gitlab
	r.GET("/gitlab/project", middlewares.Authorize("gitlab/project", "get"),
		gitlabController.ListProjects(httpHelper))
	r.POST("/gitlab/environment/name/:env_name/application/name/:app_Name/settings",
		middlewares.Authorize("gitlab/settings", "post", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.SetApplicationProject(settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/commits/recent",
		middlewares.Authorize("gitlab/commits/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/summary",
		middlewares.Authorize("gitlab/summary", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.GetProjectSummary(httpHelper, settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/swagger",
		middlewares.Authorize("gitlab/swagger", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.GetSwaggerFile(httpHelper, settingsStore))
	r.DELETE("/gitlab/environment/name/:env_name/application/name/:app_Name/settings", gitlabController.DeleteApplicationProject(settingsStore))
	r.PUT("/gitlab/environment/name/:env_name/application/name/:app_Name/settings", gitlabController.UpdateApplicationProject(settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/pulls/recent", gitlabController.ListRecentPullRequests(httpHelper, settingsStore))

	// github
	r.GET("/github/project", middlewares.Authorize("github/project", "get"),
		githubController.ListProjects(httpHelper))
	r.POST("/github/environment/name/:env_name/application/name/:app_Name/settings", middlewares.Authorize("github/settings", "post", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}),
		githubController.SetApplicationProject(settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/commits/recent",
		middlewares.Authorize("github/commits/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/summary",
		middlewares.Authorize("github/summary", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.GetProjectSummary(httpHelper, settingsStore))
	r.DELETE("/github/environment/name/:env_name/application/name/:app_Name/settings", githubController.DeleteApplicationProject(settingsStore))
	r.PUT("/github/environment/name/:env_name/application/name/:app_Name/settings", githubController.UpdateApplicationProject(settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/pulls/recent", githubController.ListRecentPullRequests(httpHelper, settingsStore))

	// bitbucket
	r.POST("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings", bitbucketController.SetApplicationProject(settingsStore))
	r.DELETE("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings", bitbucketController.DeleteApplicationProject(settingsStore))
	r.PUT("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings", bitbucketController.UpdateApplicationProject(settingsStore))
	r.GET("/bitbucket/project", bitbucketController.ListProjects(httpHelper))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/commits/recent", bitbucketController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/pulls/recent", bitbucketController.ListRecentPullRequests(httpHelper, settingsStore))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/summary", bitbucketController.GetProjectSummary(httpHelper, settingsStore))

	// swagger
	// swagUrl := ginSwagger.URL("*/swagger/doc.json") // The url pointing to API definition
	// r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, swagUrl))

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
	fmt.Println("Connecting to database")
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
