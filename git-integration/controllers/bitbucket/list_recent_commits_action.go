package bitbucket

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/config"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

type pickTimeQuery struct {
	From string `form:"from"`
	To   string `form:"to"`
}

// @Description get list of recent commits for a specific user's repository
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Param from query string false "use to declare commits in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Param to query string false "use to declare commits in range From and To dates (date format: ISO 8601 format YYYY-MM-DDTHH:MM:SSZ)"
// @Success 200 {array} string "ok"
// @Router /bitbucket/environment/name/:env_name/application/name/:app_Name/commits/recent [get]
func (controller *BitbucketController) ListRecentCommits(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		// See: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/commits
		commitsUrl := fmt.Sprintf("%s/2.0/repositories/%s/commits", integration.Url, settings.RepoFullName)

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
		var response struct {
			Values []map[string]interface{} `json:"values"`
		}
		err = json.Unmarshal(out, &response)
		if err != nil {
			err = errors.New("Failed to unmarshal commits")
			return
		}
		commits := response.Values
		var resCommits []map[string]interface{}
		var fromSeconds, toSeconds int64
		if dateRange.From != "" {
			t, err := time.Parse(time.RFC3339, dateRange.From)
			if err != nil {
				err = errors.New("From date in query parameters is invalid")
				return
			}
			fromSeconds = t.UnixNano() / int64(time.Second)
		}
		if dateRange.To != "" {
			t, err := time.Parse(time.RFC3339, dateRange.To)
			if err != nil {
				err = errors.New("To date in query parameters is invalid")
				return
			}
			toSeconds = t.UnixNano() / int64(time.Second)
		}
		for _, commit := range commits {
			t, err := time.Parse(time.RFC3339, commit["date"].(string))
			if err != nil {
				err = errors.New("Date of commit is invalid")
				return
			}
			commitSeconds := t.UnixNano() / int64(time.Second)
			if (dateRange.From == "" || commitSeconds >= fromSeconds) && (dateRange.To == "" || commitSeconds <= toSeconds) {
				resCommits = append(resCommits, commit)
			}
		}
		c.JSON(http.StatusOK, resCommits)

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

	// Get the secret and key tokens from secretmanager service
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

	// Get the Access token value from bitbucket access token services
	encoded_token := base64.StdEncoding.EncodeToString([]byte(string(out)))
	accessTokenHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: "Basic " + encoded_token, // We just pass on the user's token
		},
		{
			Key:   "Content-Type",
			Value: "application/x-www-form-urlencoded",
		},
	}
	out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodPost, bitbucketAccessTokenUrl, bytes.NewBuffer([]byte("grant_type=client_credentials")), accessTokenHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("Failed to get access token")
		return
	}
	var accTokenRespone struct {
		Scopes       string `json:"scopes"`
		AccessToken  string `json:"access_token"`
		ExpiresIn    int    `json:"expires_in"`
		TokenType    string `json:"token_type"`
		State        string `json:"state"`
		RefreshToken string `json:"refresh_token"`
	}
	err = json.Unmarshal(out, &accTokenRespone)
	if err != nil {
		err = errors.New("Failed to unmarshal bitbucket access token")
		return
	}
	resolved = &resolvedIntegration{
		Url:         integration.Url,
		AccessToken: accTokenRespone.AccessToken,
	}
	return

}

type resolvedIntegration struct {
	Url         string
	AccessToken string
}
