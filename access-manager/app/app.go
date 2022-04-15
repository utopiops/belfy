package app

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/utopiops/framework/middlewares"
	"github.com/utopiops/utopiops/access-manager/config"
	"github.com/utopiops/utopiops/access-manager/controllers/core"
)

type App struct {
	r *gin.Engine
}

func NewApp() *App {
	return &App{r: initRoute()}
}

func (a *App) Start(addr ...string) error {
	return a.r.Run(addr...)
}

func initRoute() *gin.Engine {
	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(middlewares.CORSMiddleware(config.Configs.App.AllowedOrigins))
	r.GET("/health", func(c *gin.Context) {
		c.String(http.StatusOK, "healthy")
	})
	//middlewares.SetAuthServerJwtSecret(config.Configs.Secrets.AuthServerJwtSecret)
	middlewares.SetAppName(config.Configs.Secrets.AppName)
	middlewares.SetAccessManagerUrl(config.Configs.Endpoints.AccessManager)
	tempIdsMiddleware := middlewares.NewTempIdsMiddleware(
		config.Configs.Endpoints.IdsPublic,
		config.Configs.Endpoints.IdsAdmin,
		config.Configs.Endpoints.IdsJwks,
		config.Configs.Secrets.AuthServerJwtSecret,
	)
	policy := r.Group("/policy", tempIdsMiddleware.IdsAuthorizationMiddleware())
	{
		policy.POST("/enforce", core.Enforce)
	}
	return r
}
