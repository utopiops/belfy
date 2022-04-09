package gitlab

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/config"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

type pickTimeQuery struct {
	From string `form:"from"`
	To   string `form:"to"`
}

// @Description get list of recent commits for a specific user's project
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Param from query string false "use to declare commits in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Param to query string false "use to declare commits in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Success 200 {array} string "ok"
// @Router /gitlab/environment/name/:env_name/application/name/:app_Name/commits/recent [get]
func (controller *GitlabController) ListRecentCommits(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		integration, err := GetIntegrationDetails(settings.IntegrationName, authHeader, httpHelper)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		var queries []string
		if dateRange.From != "" {
			queries = append(queries, fmt.Sprintf("since=%s", dateRange.From))
		}
		if dateRange.To != "" {
			queries = append(queries, fmt.Sprintf("until=%s", dateRange.To))
		}

		// See: https://docs.gitlab.com/ee/api/commits.html#list-repository-commits
		commitsUrl := fmt.Sprintf("%s/api/v4/projects/%s/repository/commits?", integration.Url, settings.ProjectID)
		for i, query := range queries {
			commitsUrl += query
			if i < len(queries)-1 {
				commitsUrl += "&"
			}
		}

		projectsHeaders := []shared.Header{
			{
				Key:   "Authorization",
				Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
			},
		}
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, commitsUrl, nil, projectsHeaders, 0)
		if err != nil || statusCode != http.StatusOK {
			fmt.Println(err.Error())
			c.Status(http.StatusBadRequest)
			return
		}
		commits := []map[string]interface{}{}
		json.Unmarshal(out, &commits)
		c.JSON(http.StatusOK, commits)

	}
}

func GetIntegrationDetails(integrationName, authHeader string, httpHelper shared.HttpHelper) (resolved *resolvedIntegration, err error) {
	// Get the access token and url
	method := http.MethodGet
	url := config.Configs.Endpoints.Core + fmt.Sprintf("/integration/%s", integrationName)
	headers := []shared.Header{
		{
			Key:   "Authorization",
			Value: authHeader, // We just pass on the user's token
		},
	}
	out, err, statusCode, _ := httpHelper.HttpRequest(method, url, nil, headers, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("Failed to get integration")
		return
	}
	var integration struct {
		Url       string `json:"url"`
		TokenName string `json:"tokenName"`
	}
	err = json.Unmarshal(out, &integration)
	if err != nil {
		err = errors.New("Failed to unmarshal integration")
		return
	}

	// Get the access token's value
	secretValueUrl := fmt.Sprintf("%s/simple/%s/value", config.Configs.Endpoints.SecretManager, integration.TokenName)
	secretValueHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: authHeader, // We just pass on the user's token
		},
	}
	out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodGet, secretValueUrl, nil, secretValueHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("Failed to get access token")
		return
	}
	resolved = &resolvedIntegration{
		Url:         integration.Url,
		AccessToken: string(out),
	}
	return

}

type resolvedIntegration struct {
	Url         string
	AccessToken string
}
