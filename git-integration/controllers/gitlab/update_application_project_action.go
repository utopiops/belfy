package gitlab

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description update settings of gitlab project in database
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Param settingsDto body settingsDto true "id of user's project and name of integration in our system"
// @Success 200 {} nil "ok"
// @Router /gitlab/environment/name/:env_name/application/name/:app_Name/settings [put]
func (controller *GitlabController) UpdateApplicationProject(settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		setSettingsDto := settingsDto{}
		if err := c.ShouldBindJSON(&setSettingsDto); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "integrationName and projectId are required",
			}}})
			return
		}
		authHeader := c.Request.Header.Get("Authorization")
		tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		accountID, err := shared.GetAccountId(tokenString)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		err = settingsStore.UpdateGitlabApplicationSettings(noContext, accountID, environmentName, applicationName, setSettingsDto.IntegrationName, setSettingsDto.ProjectID)

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
