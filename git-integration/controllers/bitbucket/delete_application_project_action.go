package bitbucket

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description delete settings of bitbucket repository from database
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Success 200 {} nil "ok"
// @Router /bitbucket/environment/name/:env_name/application/name/:app_Name/settings [delete]
func (controller *BitbucketController) DeleteApplicationProject(settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")
		tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		accountID, err := shared.GetAccountId(tokenString)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		err = settingsStore.DeleteBitbucketApplicationSettings(noContext, accountID, environmentName, applicationName)

		if err != nil {
			fmt.Println(err.Error())
			if err.Error() == "Provider isn't already set for the application" {
				c.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
					Code:  http.StatusBadRequest,
					Title: "Provider isn't already set for the application",
				}}})
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}

}
