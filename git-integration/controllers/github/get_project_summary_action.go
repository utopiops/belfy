package github

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

// @Description get a summary information about repository (just 5 number about repository)
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Success 200 {array} string "ok"
// @Router /github/environment/name/:env_name/application/name/:app_Name/summary [get]
func (controller *GithubController) GetProjectSummary(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		// Get the Github settings (should exist, o.w. bad request)
		settings, err := settingsStore.GetGithubSettings(noContext, accountID, environmentName, applicationName)
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

		releaseResult := make(chan getResult, 1)
		contributorsResult := make(chan getResult, 1)
		branchesResult := make(chan getResult, 1)
		openMergeRequestsResult := make(chan getResult, 1)
		issuesResult := make(chan getResult, 1)
		errChan := make(chan error, 5)

		defer close(releaseResult)
		defer close(contributorsResult)
		defer close(branchesResult)
		defer close(openMergeRequestsResult)
		defer close(issuesResult)
		defer close(errChan)

		// See: https://docs.github.com/en/rest/reference/repos#list-releases
		releaseUrl := fmt.Sprintf("%s/repos/%s/releases", integration.Url, settings.RepoFullName)
		go githubGetRequest(httpHelper, releaseUrl, integration.AccessToken, githubRequestTimeLimit, releaseResult, errChan)

		// See: https://docs.github.com/en/rest/reference/repos#get-all-contributor-commit-activity
		contributorsUrl := fmt.Sprintf("%s/repos/%s/stats/contributors", integration.Url, settings.RepoFullName)
		go githubGetRequest(httpHelper, contributorsUrl, integration.AccessToken, githubRequestTimeLimit, contributorsResult, errChan)

		// See: https://docs.github.com/en/rest/reference/repos#list-branches
		branchesUrl := fmt.Sprintf("%s/repos/%s/branches", integration.Url, settings.RepoFullName)
		go githubGetRequest(httpHelper, branchesUrl, integration.AccessToken, githubRequestTimeLimit, branchesResult, errChan)

		// See: https://docs.github.com/en/rest/reference/pulls#list-pull-requests
		openMergeRequestsUrl := fmt.Sprintf("%s/repos/%s/pulls?state=open", integration.Url, settings.RepoFullName)
		go githubGetRequest(httpHelper, openMergeRequestsUrl, integration.AccessToken, githubRequestTimeLimit, openMergeRequestsResult, errChan)

		// See: https://docs.github.com/en/rest/reference/issues#list-repository-issues
		issuesUrl := fmt.Sprintf("%s/repos/%s/issues?state=open", integration.Url, settings.RepoFullName)
		go githubGetRequest(httpHelper, issuesUrl, integration.AccessToken, githubRequestTimeLimit, issuesResult, errChan)

		projectSummaryDto := struct {
			ReleaseCount           int `json:"releaseCount"`
			ContributorsCount      int `json:"contributorsCount"`
			BranchCount            int `json:"branchCount"`
			OpenMergeRequestsCount int `json:"openMergeRequestsCount"`
			IssuesCount            int `json:"issuesCount"`
		}{}

		for i := 0; i < 5; i++ {
			select {
			case <-time.After(githubRequestTimeLimit):
				fmt.Println("timeout")
				continue
			case err := <-errChan:
				fmt.Println(err)
				c.Status(http.StatusInternalServerError)
				break
			case result := <-releaseResult:
				var releases []interface{}
				json.Unmarshal(result.Payload, &releases)
				projectSummaryDto.ReleaseCount = len(releases)
				continue
			case result := <-contributorsResult:
				var contributors []interface{}
				json.Unmarshal(result.Payload, &contributors)
				projectSummaryDto.ContributorsCount = len(contributors)
				continue
			case result := <-branchesResult:
				var branches []interface{}
				json.Unmarshal(result.Payload, &branches)
				projectSummaryDto.BranchCount = len(branches)
				continue
			case result := <-openMergeRequestsResult:
				var openMergeRequests []interface{}
				json.Unmarshal(result.Payload, &openMergeRequests)
				projectSummaryDto.OpenMergeRequestsCount = len(openMergeRequests)
				continue
			case result := <-issuesResult:
				var issues []interface{}
				json.Unmarshal(result.Payload, &issues)
				projectSummaryDto.IssuesCount = len(issues)
				continue
			}
		}

		c.JSON(http.StatusOK, projectSummaryDto)

	}
}

func githubGetRequest(httpHelper shared.HttpHelper, url, accessToken string, timeout time.Duration, result chan getResult, errChan chan error) {
	projectsHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: fmt.Sprintf("token %s", accessToken),
		},
	}
	out, err, statusCode, header := httpHelper.HttpRequest(http.MethodGet, url, nil, projectsHeaders, githubRequestTimeLimit)
	fmt.Println(statusCode)
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
