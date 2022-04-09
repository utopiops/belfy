package bitbucket

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
)

const (
	MaxProjectLength int = 150
)

type project struct {
	FullName string                 `json:"full_name"`
	Links    map[string]interface{} `json:"links"`
}

type queryString struct {
	IntegrationName string `form:"integration_name"`
	Url             string `form:"url"`
	AccessToken     string `form:"access_token"`
}

type IntermediaryError struct {
}

// @Description get list of all user's repositories
// @Param integration_name query string true "name of user integration in our system"
// @Success 200 {array} project	"ok"
// @Router /bitbucket/project [get]
func (controller *BitbucketController) ListProjects(httpHelper shared.HttpHelper) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")

		var qs queryString
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
			integration, err = GetIntegrationDetails(qs.IntegrationName, authHeader, httpHelper, c)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"err": "invalid integration name",
				})
				return
			}
		} else {
			accessToken, err := GetBitbucketAccessToken(qs.AccessToken, httpHelper)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"err": err.Error(),
				})
				return
			}
			integration = &resolvedIntegration{
				Url:         qs.Url,
				AccessToken: accessToken,
			}
		}

		// Get the list of projects from Bitbucket

		// We limit the number of the projects to avoid potential misuse (no idea atm how it could be just don't wanna keep it unlimited), and perhaps allow different tierings in the future
		projects := make([]project, 0, MaxProjectLength)
		// SEE: https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories
		itemsPerPage := 100
		projectsUrl := fmt.Sprintf("%s/2.0/repositories?role=owner&pagelen=%d", integration.Url, itemsPerPage)
		for {
			projectsHeaders := []shared.Header{
				{
					Key:   "Authorization",
					Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
				},
			}
			out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, projectsUrl, nil, projectsHeaders, 0)
			fmt.Println("statusCode here", statusCode)
			if err != nil || statusCode != http.StatusOK {
				// fmt.Println(err.Error())
				c.Status(http.StatusBadRequest)
				return
			}
			type response struct {
				NextPage string    `json:"next"`
				Values   []project `json:"values"`
			}
			resp := response{}
			err = json.Unmarshal(out, &resp)
			if err != nil {
				fmt.Println(err.Error())
				c.Status(http.StatusInternalServerError)
				return
			}
			var newBatch []project = resp.Values

			limit := MaxProjectLength - len(projects)
			projects = append(projects, newBatch[:MinInt(limit, len(newBatch))]...)
			limit = MaxProjectLength - len(projects)
			if limit == 0 || len(newBatch) < itemsPerPage { // If you've reached the limit or the items returned is less than what it could be (a sign it's finished) stop iterating
				break
			}
			if resp.NextPage == "" { // To address the edge cases like last batch is exactly has exactly same length as itemsPerPage, check if there is a next batch link in the header
				break
			}
			projectsUrl = resp.NextPage
		}
		c.JSON(http.StatusOK, projects)
	}
}

func MinInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
