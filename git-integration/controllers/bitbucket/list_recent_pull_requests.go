package bitbucket

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description get list of recent pull requests for a specific user's repository
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Param from query string false "use to declare pull requests in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Param to query string false "use to declare pull requests in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Success 200 {array} string "ok"
// @Router /bitbucket/environment/name/:env_name/application/name/:app_Name/pulls/recent [get]
func (controller *BitbucketController) ListRecentPullRequests(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")
		tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		accountID, err := shared.GetAccountId(tokenString)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		var dateRange pickTimeQuery
		if c.ShouldBindQuery(&dateRange) != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		environmentName := c.Param("env_name")
		applicationName := c.Param("app_Name")

		// Get the Bitbucket settings (should exist, o.w. bad request)
		settings, err := settingsStore.GetBitbucketSettings(noContext, accountID, environmentName, applicationName)
		if err != nil {
			log.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		integration, err := GetIntegrationDetails(settings.IntegrationName, authHeader, httpHelper)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		var queries []string
		if dateRange.From != "" {
			queries = append(queries, fmt.Sprintf("updated_on>=%s", dateRange.From))
		}
		if dateRange.To != "" {
			queries = append(queries, fmt.Sprintf("updated_on<=%s", dateRange.To))
		}

		// See: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/pullrequests
		pullsUrl := fmt.Sprintf("%s/2.0/repositories/%s/pullrequests?q=", integration.Url, settings.RepoFullName)
		for i, query := range queries {
			pullsUrl += query
			if i < len(queries)-1 {
				pullsUrl += "+AND+"
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
			fmt.Println(err.Error())
			c.Status(http.StatusBadRequest)
			return
		}
		var response struct {
			Values []map[string]interface{} `json:"values"`
		}
		err = json.Unmarshal(out, &response)
		if err != nil {
			err = errors.New("Failed to unmarshal commits")
			return
		}
		pulls := response.Values
		var resPulls []map[string]interface{}
		for _, pull := range pulls {
			if pull["state"] == "OPEN" {
				resPulls = append(resPulls, pull)
			}
		}
		if resPulls == nil {
			c.Status(http.StatusOK)
		} else {
			c.JSON(http.StatusOK, resPulls)
		}

	}
}
