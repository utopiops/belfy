package cloudwatch

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/log-integration/shared"
	"gitlab.com/utopiops-water/log-integration/stores"
)

func (controller *CloudwatchController) SetApplicationSettings(settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		var setSettingsDto struct {
			Region string `json:"region"`
		}
		if err := c.ShouldBindJSON(&setSettingsDto); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "region is required",
			}}})
			return
		}

		fmt.Println("setSettingsDto", setSettingsDto)

		// authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.Status(http.StatusBadRequest)
			return
		}
		accountID := accountIdInterface.(string)

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		err := settingsStore.SetCloudwatchApplicationSettings(noContext, accountID, environmentName, applicationName, setSettingsDto.Region)

		if err != nil {
			fmt.Println(err.Error())
			if err.Error() == "Provider is already set for the application" {
				c.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
					Code:  http.StatusBadRequest,
					Title: "Provider is already set for the application",
				}}})
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}

}
