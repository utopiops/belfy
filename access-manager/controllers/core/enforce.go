package core

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Enforce(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"allowed": true})
}
