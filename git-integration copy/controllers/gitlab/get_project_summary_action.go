package gitlab

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// @Description get a summary information about project (just 5 number about project)
// @Param env_name path string true "name of user environment in our system"
// @Param app_Name path string true "name of user application in our system"
// @Success 200 {array} string "ok"
// @Router /gitlab/environment/name/:env_name/application/name/:app_Name/summary [get]
func (controller *GitlabController) GetProjectSummary(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		// See: https://docs.gitlab.com/ee/api/releases/#list-releases
		releaseUrl := fmt.Sprintf("%s/api/v4/projects/%s/releases", integration.Url, settings.ProjectID)
		go gitlabGetRequest(httpHelper, releaseUrl, integration.AccessToken, gitlabRequestTimeLimit, releaseResult, errChan)

		// See: https://docs.gitlab.com/ee/api/repositories.html#contributors
		contributorsUrl := fmt.Sprintf("%s/api/v4/projects/%s/repository/contributors", integration.Url, settings.ProjectID)
		go gitlabGetRequest(httpHelper, contributorsUrl, integration.AccessToken, gitlabRequestTimeLimit, contributorsResult, errChan)

		// See: https://docs.gitlab.com/ee/api/branches.html#list-repository-branches
		branchesUrl := fmt.Sprintf("%s/api/v4/projects/%s/repository/branches", integration.Url, settings.ProjectID)
		go gitlabGetRequest(httpHelper, branchesUrl, integration.AccessToken, gitlabRequestTimeLimit, branchesResult, errChan)

		// See: https://docs.gitlab.com/ee/api/merge_requests.html#list-merge-requests
		openMergeRequestsUrl := fmt.Sprintf("%s/api/v4/projects/%s/merge_requests?state=opened", integration.Url, settings.ProjectID)
		go gitlabGetRequest(httpHelper, openMergeRequestsUrl, integration.AccessToken, gitlabRequestTimeLimit, openMergeRequestsResult, errChan)

		// See: https://docs.gitlab.com/ee/api/issues.html#list-issues
		issuesUrl := fmt.Sprintf("%s/api/v4/projects/%s/issues?state=opened", integration.Url, settings.ProjectID)
		go gitlabGetRequest(httpHelper, issuesUrl, integration.AccessToken, gitlabRequestTimeLimit, issuesResult, errChan)

		projectSummaryDto := struct {
			ReleaseCount           string `json:"releaseCount"`
			ContributorsCount      string `json:"contributorsCount"`
			BranchCount            string `json:"branchCount"`
			OpenMergeRequestsCount string `json:"openMergeRequestsCount"`
			IssuesCount            string `json:"issuesCount"`
		}{}

		for i := 0; i < 5; i++ {
			select {
			case <-time.After(gitlabRequestTimeLimit):
				fmt.Println("timeout")
				continue
			case err := <-errChan:
				fmt.Println(err)
				c.Status(http.StatusInternalServerError)
				break
			case result := <-releaseResult:
				projectSummaryDto.ReleaseCount = result.Header.Get("X-Total")
				continue
			case result := <-contributorsResult:
				projectSummaryDto.ContributorsCount = result.Header.Get("X-Total")
				continue
			case result := <-branchesResult:
				fmt.Println(result.Header)
				projectSummaryDto.BranchCount = result.Header.Get("X-Total")
				continue
			case result := <-openMergeRequestsResult:
				fmt.Println(result.Header)
				projectSummaryDto.OpenMergeRequestsCount = result.Header.Get("X-Total")
				continue
			case result := <-issuesResult:
				fmt.Println(result.Header)
				projectSummaryDto.IssuesCount = result.Header.Get("X-Total")
				continue
			}
		}

		c.JSON(http.StatusOK, projectSummaryDto)

	}
}

func gitlabGetRequest(httpHelper shared.HttpHelper, url, accessToken string, timeout time.Duration, result chan getResult, errChan chan error) {
	projectsHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: fmt.Sprintf("Bearer %s", accessToken),
		},
	}
	out, err, statusCode, header := httpHelper.HttpRequest(http.MethodGet, url, nil, projectsHeaders, gitlabRequestTimeLimit)
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
	fmt.Println(result)
}

type getResult struct {
	Payload []byte
	Header  *http.Header
}
