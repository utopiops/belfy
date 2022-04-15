package healthcheck

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthCheck struct{}

func New() *HealthCheck {
	return &HealthCheck{}
}

func (h *HealthCheck) Healthcheck(ctx *gin.Context) {
	ctx.String(http.StatusOK, "healthy")
}
