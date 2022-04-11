package settings

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/stores"
)

func (controller *SettingsController) GetServiceName(settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

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

		name, err := settingsStore.GetServiceName(noContext, accountID, environmentName, applicationName)

		if err != nil {
			fmt.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{"name": name})
	}
}
