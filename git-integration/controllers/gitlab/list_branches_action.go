package gitlab

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

const (
	MaxBranchLength int = 150
)

type branch struct {
	Name    string `json:"name"`
	Default bool   `json:"default"`
	Url     string `json:"web_url"`
}

func (controller *GitlabController) ListBranches(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")

		var qs struct {
			IntegrationName string `form:"integration_name"`
			Url             string `form:"url"`
			AccessToken     string `form:"access_token"`
			ID              int    `form:"id"`
		}
		if c.ShouldBindQuery(&qs) != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		if qs.IntegrationName == "" && (qs.AccessToken == "" || qs.Url == "") {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": "invalid query string parameters",
			})
			return
		}

		var integration *resolvedIntegration
		if qs.IntegrationName != "" {
			var err error
			integration, err = GetIntegrationDetails(qs.IntegrationName, authHeader, httpHelper, c, settingsStore)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"err": "invalid integration name",
				})
				return
			}
		} else {
			integration = &resolvedIntegration{
				Url:         qs.Url,
				AccessToken: qs.AccessToken,
			}
		}
		// Get the list of branches from Gitlab

		branches := make([]branch, 0, MaxBranchLength)
		// SEE: https://docs.gitlab.com/ee/api/branches.html#list-repository-branches
		itemsPerPage := 100
		branchesUrl := fmt.Sprintf("%s/api/v4/projects/%d/repository/branches?per_page=%d", integration.Url, qs.ID, itemsPerPage)
		for {
			branchesHeaders := []shared.Header{
				{
					Key:   "Authorization",
					Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
				},
			}
			out, err, statusCode, header := httpHelper.HttpRequest(http.MethodGet, branchesUrl, nil, branchesHeaders, 0)
			fmt.Println("url:", branchesUrl)
			fmt.Println("statusCode here", statusCode)
			if err != nil || statusCode != http.StatusOK {
				c.Status(http.StatusBadRequest)
				return
			}
			var newBatch []branch
			err = json.Unmarshal(out, &newBatch)
			if err != nil {
				fmt.Println(err.Error())
				c.Status(http.StatusInternalServerError)
				return
			}

			limit := MaxBranchLength - len(branches)
			branches = append(branches, newBatch[:MinInt(limit, len(newBatch))]...)
			limit = MaxBranchLength - len(branches)
			if limit == 0 || len(newBatch) < itemsPerPage { // If you've reached the limit or the items returned is less than what it could be (a sign it's finished) stop iterating
				break
			}
			linkHeader := header.Get("link")
			sentinel := "; rel=\"next\""
			if linkHeader == "" || !strings.Contains(linkHeader, sentinel) { // To address the edge cases like last batch is exactly has exactly same length as itemsPerPage, check if there is a next batch link in the header
				break
			}
			branchesUrl = strings.TrimSuffix(strings.TrimPrefix(strings.Split(linkHeader, sentinel)[0], "<"), ">")
		}
		c.JSON(http.StatusOK, branches)
	}
}
