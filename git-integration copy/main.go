package main

import (
	"fmt"
	"log"

	"gitlab.com/utopiops-water/git-integration/db"
	"gitlab.com/utopiops-water/git-integration/shared"

	"gitlab.com/utopiops-water/git-integration/controllers/bitbucket"
	"gitlab.com/utopiops-water/git-integration/controllers/github"
	"gitlab.com/utopiops-water/git-integration/controllers/gitlab"
	"gitlab.com/utopiops-water/git-integration/controllers/health"
	"gitlab.com/utopiops-water/git-integration/controllers/settings"
	dbPkg "gitlab.com/utopiops-water/git-integration/db"
	"gitlab.com/utopiops-water/git-integration/stores"

	"github.com/dgraph-io/ristretto"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis"
	"github.com/joho/godotenv"
	"github.com/newrelic/go-agent/v3/integrations/nrgin"
	"github.com/newrelic/go-agent/v3/newrelic"
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
	db, redisClient, err := initializeDB()
	shared.FailOnError(err, "Database initialization failed, exiting the app with error!")
	//var db *db.DB
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
	settingsStore := stores.NewSettingsStore(db, redisClient)

	// Routes
	r.GET("/health", healthCheckController.GetStatus(settingsStore))

	// r.Use(middlewares.JwtAuthorizationMiddleware())
	r.Use(tempIdsMiddleware.IdsAuthorizationMiddleware())

	// TODO: Providers to be called here
	settingsController := settings.SettingsController{}
	gitlabController := gitlab.GitlabController{Cache: cache}
	githubController := github.GithubController{Cache: cache}
	bitbucketController := bitbucket.BitbucketController{Cache: cache}
	httpHelper := shared.NewHttpHelper(shared.NewHttpClient())
	// AuthorizeResource is a struct to define type and key to get value from request which needs to be a part of resource
	type ar = frameworkModels.AuthorizeResource

	// Routes
	r.GET("/settings/environment/name/:env_name/application/name/:app_Name/service/name",
		auditMiddleware.Audit("Get service name"),
		middlewares.Authorize("settings/service/name", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), settingsController.GetServiceName(settingsStore))
	r.GET("/settings/get/token/accountId/:account_id",
		settingsController.RetrieveAccessToken(settingsStore, httpHelper))

	// gitlab
	r.GET("/gitlab/project",
		auditMiddleware.Audit("Get gitlab projects"),
		middlewares.Authorize("gitlab/project", "get"),
		gitlabController.ListProjects(httpHelper, settingsStore))
	r.GET("/gitlab/branch",
		auditMiddleware.Audit("Get gitlab branches"),
		middlewares.Authorize("gitlab/project", "get"),
		gitlabController.ListBranches(httpHelper, settingsStore))
	r.POST("/gitlab/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Set gitlab application settings"),
		middlewares.Authorize("gitlab/settings", "post", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.SetApplicationProject(settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/commits/recent",
		auditMiddleware.Audit("Get gitlab recent commits"),
		middlewares.Authorize("gitlab/commits/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/summary",
		auditMiddleware.Audit("Get gitlab project summary"),
		middlewares.Authorize("gitlab/summary", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.GetProjectSummary(httpHelper, settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/swagger",
		auditMiddleware.Audit("Get gitlab project swagger file"),
		middlewares.Authorize("gitlab/swagger", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.GetSwaggerFile(httpHelper, settingsStore))
	r.DELETE("/gitlab/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Delete gitlab application settings"),
		middlewares.Authorize("gitlab/settings", "delete", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.DeleteApplicationProject(settingsStore))
	r.PUT("/gitlab/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Update gitlab application settings"),
		middlewares.Authorize("gitlab/settings", "put", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.UpdateApplicationProject(settingsStore))
	r.GET("/gitlab/environment/name/:env_name/application/name/:app_Name/pulls/recent",
		auditMiddleware.Audit("Get gitlab recent merge requests"),
		middlewares.Authorize("gitlab/pulls/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), gitlabController.ListRecentPullRequests(httpHelper, settingsStore))
	r.POST("/gitlab/webhook/add",
		auditMiddleware.Audit("Add gitlab webhook"),
		middlewares.Authorize("gitlab/settings", "post"), gitlabController.AddWebhook(httpHelper, settingsStore))

	// github
	r.GET("/github/project",
		auditMiddleware.Audit("Get github projects"),
		middlewares.Authorize("github/project", "get"),
		githubController.ListProjects(httpHelper, settingsStore))
	r.GET("/github/branch",
		auditMiddleware.Audit("Get github branches"),
		middlewares.Authorize("github/project", "get"),
		githubController.ListBranches(httpHelper, settingsStore))
	r.POST("/github/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Set github application settings"),
		middlewares.Authorize("github/settings", "post", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.SetApplicationProject(settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/commits/recent",
		auditMiddleware.Audit("Get github recent commits"),
		middlewares.Authorize("github/commits/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/summary",
		auditMiddleware.Audit("Get github project summary"),
		middlewares.Authorize("github/summary", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.GetProjectSummary(httpHelper, settingsStore))
	r.DELETE("/github/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Delete github application settings"),
		middlewares.Authorize("github/settings", "delete", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.DeleteApplicationProject(settingsStore))
	r.PUT("/github/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Update github application settings"),
		middlewares.Authorize("github/settings", "put", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.UpdateApplicationProject(settingsStore))
	r.GET("/github/environment/name/:env_name/application/name/:app_Name/pulls/recent",
		auditMiddleware.Audit("Get github recent pull requests"),
		middlewares.Authorize("github/pulls/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), githubController.ListRecentPullRequests(httpHelper, settingsStore))

	// bitbucket
	r.POST("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Set bitbucket application settings"),
		middlewares.Authorize("bitbucket/settings", "post", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.SetApplicationProject(settingsStore))
	r.DELETE("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Delete bitbucket application settings"),
		middlewares.Authorize("bitbucket/settings", "delete", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.DeleteApplicationProject(settingsStore))
	r.PUT("/bitbucket/environment/name/:env_name/application/name/:app_Name/settings",
		auditMiddleware.Audit("Update bitbucket application settings"),
		middlewares.Authorize("bitbucket/settings", "put", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.UpdateApplicationProject(settingsStore))
	r.GET("/bitbucket/project",
		auditMiddleware.Audit("Get bitbucket projects"),
		middlewares.Authorize("bitbucket/project", "get"),
		bitbucketController.ListProjects(httpHelper))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/commits/recent",
		auditMiddleware.Audit("Get bitbucket recent commits"),
		middlewares.Authorize("bitbucket/commits/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.ListRecentCommits(httpHelper, settingsStore))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/pulls/recent",
		auditMiddleware.Audit("Get bitbucket recent pull requests"),
		middlewares.Authorize("bitbucket/pulls/recent", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.ListRecentPullRequests(httpHelper, settingsStore))
	r.GET("/bitbucket/environment/name/:env_name/application/name/:app_Name/summary",
		auditMiddleware.Audit("Get bitbucket project summary"),
		middlewares.Authorize("bitbucket/summary", "get", ar{Type: "param", Key: "env_name"}, ar{Type: "param", Key: "app_Name"}), bitbucketController.GetProjectSummary(httpHelper, settingsStore))

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

func initializeDB() (db *db.DB, redisClient *redis.Client, err error) {
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
	db, err = dbPkg.Connect(driver, connStr)
	if err != nil {
		return
	}

	opt := &redis.Options{
		Addr: fmt.Sprintf("%s:%d", config.Configs.Redis.Host, config.Configs.Redis.Port),
		// Password: config.Configs.Redis.Password,
	}
	redisClient, err = dbPkg.RedisConnect(opt)

	return db, redisClient, err
}

func setupCache() (cache *ristretto.Cache, err error) {
	cache, err = ristretto.NewCache(&ristretto.Config{
		NumCounters: 1e7,     // number of keys to track frequency of (10M).
		MaxCost:     1 << 30, // maximum cost of cache (1GB).
		BufferItems: 64,      // number of keys per Get buffer.
	})
	return
}
