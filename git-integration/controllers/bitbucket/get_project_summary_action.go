package bitbucket

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description get a summary information about repository (just 3 number about repository)
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Success 200 {array} string "ok"
// @Router /bitbucket/environment/name/:env_name/application/name/:app_Name/summary [get]
func (controller *BitbucketController) GetProjectSummary(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		branchesResult := make(chan getResult, 1)
		openMergeRequestsResult := make(chan getResult, 1)
		issuesResult := make(chan getResult, 1)
		errChan := make(chan error, 5)

		defer close(branchesResult)
		defer close(openMergeRequestsResult)
		defer close(issuesResult)
		defer close(errChan)

		// See: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/refs/branches
		branchesUrl := fmt.Sprintf("%s/2.0/repositories/%s/refs/branches", integration.Url, settings.RepoFullName)
		go bitbucketGetRequest(httpHelper, branchesUrl, integration.AccessToken, bitbucketRequestTimeLimit, branchesResult, errChan)

		// See: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/pullrequests
		openMergeRequestsUrl := fmt.Sprintf("%s/2.0/repositories/%s/pullrequests?state=OPEN", integration.Url, settings.RepoFullName)
		go bitbucketGetRequest(httpHelper, openMergeRequestsUrl, integration.AccessToken, bitbucketRequestTimeLimit, openMergeRequestsResult, errChan)

		// See: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/issues
		issuesUrl := fmt.Sprintf("%s/2.0/repositories/%s/issues", integration.Url, settings.RepoFullName)
		go bitbucketGetRequest(httpHelper, issuesUrl, integration.AccessToken, bitbucketRequestTimeLimit, issuesResult, errChan)

		projectSummaryDto := struct {
			BranchCount            int `json:"branchCount"`
			OpenMergeRequestsCount int `json:"openMergeRequestsCount"`
			IssuesCount            int `json:"issuesCount"`
		}{}

		for i := 0; i < 5; i++ {
			select {
			case <-time.After(bitbucketRequestTimeLimit):
				fmt.Println("timeout")
				continue
			case err := <-errChan:
				fmt.Println(err)
				c.Status(http.StatusInternalServerError)
				break
			case result := <-branchesResult:
				var response struct {
					Values []interface{} `json:"values"`
				}
				jsonErr := json.Unmarshal(result.Payload, &response)
				if jsonErr != nil {
					fmt.Println(jsonErr.Error())
					c.Status(http.StatusInternalServerError)
					return
				}
				branches := response.Values
				projectSummaryDto.BranchCount = len(branches)
				continue
			case result := <-openMergeRequestsResult:
				var response struct {
					Values []interface{} `json:"values"`
				}
				jsonErr := json.Unmarshal(result.Payload, &response)
				if jsonErr != nil {
					fmt.Println(jsonErr.Error())
					c.Status(http.StatusInternalServerError)
					return
				}
				openMergeRequests := response.Values
				projectSummaryDto.OpenMergeRequestsCount = len(openMergeRequests)
				continue
			case result := <-issuesResult:
				type issue struct {
					State string `json:"state"`
				}
				var response struct {
					Values []issue `json:"values"`
				}
				jsonErr := json.Unmarshal(result.Payload, &response)
				if jsonErr != nil {
					fmt.Println(jsonErr.Error())
					c.Status(http.StatusInternalServerError)
					return
				}
				issues := response.Values
				res := 0
				for _, userIssue := range issues {
					if userIssue.State == "open" || userIssue.State == "new" {
						res++
					}
				}
				projectSummaryDto.IssuesCount = res
				continue
			}
		}

		c.JSON(http.StatusOK, projectSummaryDto)

	}
}

func bitbucketGetRequest(httpHelper shared.HttpHelper, url, accessToken string, timeout time.Duration, result chan getResult, errChan chan error) {
	projectsHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: fmt.Sprintf("Bearer %s", accessToken),
		},
	}
	out, err, statusCode, header := httpHelper.HttpRequest(http.MethodGet, url, nil, projectsHeaders, bitbucketRequestTimeLimit)
	if err != nil {
		errChan <- err
		return
	}
	if statusCode != http.StatusOK {
		errChan <- errors.New(fmt.Sprintf("Status code: %d", statusCode))
		return
	}
	result <- getResult{
		Payload: out,
		Header:  header,
	}
}

type getResult struct {
	Payload []byte
	Header  *http.Header
}
