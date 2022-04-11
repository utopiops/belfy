package gitlab

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description get list of recent merge requests for a specific user's project
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Param from query string false "use to declare merge requests in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Param to query string false "use to declare merge requests in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Success 200 {array} string "ok"
// @Router /gitlab/environment/name/:env_name/application/name/:app_Name/pulls/recent [get]
func (controller *GitlabController) ListRecentPullRequests(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.Status(http.StatusBadRequest)
			return
		}
		accountID := accountIdInterface.(string)

		var dateRange pickTimeQuery
		if c.ShouldBindQuery(&dateRange) != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		// Get the Gitlab settings (should exist, o.w. bad request)
		settings, err := settingsStore.GetGitlabSettings(noContext, accountID, environmentName, applicationName)
		if err != nil {
			log.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		integration, err := GetIntegrationDetails(settings.IntegrationName, authHeader, httpHelper, c, settingsStore)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		var queries []string
		queries = append(queries, "state=opened")
		if dateRange.From != "" {
			queries = append(queries, fmt.Sprintf("updated_after=%s", dateRange.From))
		}
		if dateRange.To != "" {
			queries = append(queries, fmt.Sprintf("updated_before=%s", dateRange.To))
		}

		// See: https://docs.gitlab.com/ee/api/merge_requests.html#list-merge-requests
		pullsUrl := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests?", integration.Url, settings.ProjectID)
		for i, query := range queries {
			pullsUrl += query
			if i < len(queries)-1 {
				pullsUrl += "&"
			}
		}

		pullsHeaders := []shared.Header{
			{
				Key:   "Authorization",
				Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
			},
		}
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, pullsUrl, nil, pullsHeaders, 0)
		if err != nil || statusCode != http.StatusOK {
			// fmt.Println(err.Error())
			c.Status(http.StatusBadRequest)
			return
		}
		pulls := []map[string]interface{}{}
		json.Unmarshal(out, &pulls)
		c.JSON(http.StatusOK, pulls)

	}
}
