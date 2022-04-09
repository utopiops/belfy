package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/log-integration/db"
)

func (jlc *HealthCheckController) GetStatus(db *db.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		err := db.Connection.Ping()
		if err != nil {
			c.String(http.StatusInternalServerError, "unhealthy")
			return
		}
		c.String(http.StatusOK, "healthy")
	}
}
