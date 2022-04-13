package usageController

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/plan-manager/models"
)

type UsageController struct {
}

func New() *UsageController {
	return &UsageController{}
}

func (u *UsageController) InitUser(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
}

func (u *UsageController) UpdateBuildTime(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
}

func (u *UsageController) GetBuildTime(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
	return
}

func (u *UsageController) CreateApplication(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
	return
}

func (u *UsageController) DeleteApplication(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
	return
}

func (u *UsageController) CallFunction(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"access": true,
	})
}

func (u *UsageController) CheckAccess(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, models.AccessDto{
		Access: true,
		Plan:   models.Premium,
		Used:   0,
		Limit:  163,
	})
}

func (u *UsageController) Enforce(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"allowed": true,
	})
	return
}

func (u *UsageController) AddUser(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
}

func (u *UsageController) EndUser(ctx *gin.Context) {
	ctx.Status(http.StatusOK)
}
