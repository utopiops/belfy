package settings

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description checks that we stored information of a specific database server on our system or not
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Success 200 {array} string "ok"
// @Router /settings/environment/name/{env_name}/database/name/{db_name}/enabled [get]
func (controller *SettingsController) IsEnabled(settingsStore stores.SettingsStore) gin.HandlerFunc {
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
		databaseName := c.Param("db_name")

		isEnabled, err := settingsStore.IsEnabled(noContext, accountID, environmentName, databaseName)

		if err != nil {
			fmt.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{"isEnabled": isEnabled})
	}
}
