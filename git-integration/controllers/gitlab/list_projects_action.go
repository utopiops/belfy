package gitlab

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/shared"
)

const (
	MaxProjectLength int = 150
)

type project struct {
	NameWithNameSpace string `json:"name_with_namespace"`
	ID                int    `json:"id"`
}

type queryString struct {
	IntegrationName string `form:"integration_name"`
}

type IntermediaryError struct {
}

// @Description get list of all user's projects
// @Param integration_name query string true "name of user integration in our system"
// @Success 200 {array} project	"ok"
// @Router /gitlab/project [get]
func (controller *GitlabController) ListProjects(httpHelper shared.HttpHelper) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")

		var qs queryString
		if c.ShouldBindQuery(&qs) != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		integration, err := GetIntegrationDetails(qs.IntegrationName, authHeader, httpHelper)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}

		// Get the list of projects from Gitlab

		// We limit the number of the projects to avoid potential misuse (no idea atm how it could be just don't wanna keep it unlimited), and perhaps allow different tierings in the future
		projects := make([]project, 0, MaxProjectLength)
		// SEE: https://docs.gitlab.com/ee/api/projects.html#list-all-projects
		itemsPerPage := 100
		projectsUrl := fmt.Sprintf("%s/api/v4/projects?owned=true&simple=true&per_page=%d", integration.Url, itemsPerPage)
		for {
			projectsHeaders := []shared.Header{
				{
					Key:   "Authorization",
					Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
				},
			}
			out, err, statusCode, header := httpHelper.HttpRequest(http.MethodGet, projectsUrl, nil, projectsHeaders, 0)
			fmt.Println("statusCode here (line 91!)", statusCode)
			if err != nil || statusCode != http.StatusOK {
				c.Status(http.StatusBadRequest)
				return
			}
			var newBatch []project
			err = json.Unmarshal(out, &newBatch)
			if err != nil {
				fmt.Println(err.Error())
				c.Status(http.StatusInternalServerError)
				return
			}

			limit := MaxProjectLength - len(projects)
			projects = append(projects, newBatch[:MinInt(limit, len(newBatch))]...)
			limit = MaxProjectLength - len(projects)
			if limit == 0 || len(newBatch) < itemsPerPage { // If you've reached the limit or the items returned is less than what it could be (a sign it's finished) stop iterating
				break
			}
			linkHeader := header.Get("link")
			sentinel := "; rel=\"next\""
			if linkHeader == "" || !strings.Contains(linkHeader, sentinel) { // To address the edge cases like last batch is exactly has exactly same length as itemsPerPage, check if there is a next batch link in the header
				break
			}
			projectsUrl = strings.TrimSuffix(strings.TrimPrefix(strings.Split(linkHeader, sentinel)[0], "<"), ">")
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
