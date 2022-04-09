package gitlab

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

func (controller *GitlabController) GetSwaggerFile(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.Request.Header.Get("Authorization")
		tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		accountID, err := shared.GetAccountId(tokenString)
		if err != nil {
			fmt.Println("1")
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
				fmt.Println("2")
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
		projectsHeaders := []shared.Header{
			{
				Key:   "Authorization",
				Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
			},
		}
		// finding default branch
		branchName, ok := c.GetQuery("branch")
		if !ok {
			branchName, err = GetDefaultBranchName(integration, settings.ProjectID, httpHelper)
			if err != nil {
				fmt.Println("3")
				c.String(http.StatusBadRequest, err.Error())
			}
		}
		// first check for yaml file then if there was no yaml goes for json
		getFileUrl := fmt.Sprintf("%s/api/v4/projects/%s/repository/files/swagger.yaml/raw?ref=%s", integration.Url, settings.ProjectID, branchName)
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, getFileUrl, nil, projectsHeaders, gitlabRequestTimeLimit)
		if err == nil && statusCode == http.StatusOK {
			c.String(http.StatusOK, string(out))
			return
		}
		getFileUrl = fmt.Sprintf("%s/api/v4/projects/%s/repository/files/swagger.json/raw?ref=%s", integration.Url, settings.ProjectID, branchName)
		out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodGet, getFileUrl, nil, projectsHeaders, gitlabRequestTimeLimit)
		if err == nil && statusCode == http.StatusOK {
			c.String(http.StatusOK, string(out))
			return
		}
		var res string
		if err != nil {
			res = err.Error()
		}
		c.String(statusCode, res)
	}
}

func GetDefaultBranchName(integration *resolvedIntegration, id string, httpHelper shared.HttpHelper) (string, error) {
	getBranchesUrl := fmt.Sprintf("%s/api/v4/projects/%s/repository/branches", integration.Url, id)
	projectsHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
		},
	}
	out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, getBranchesUrl, nil, projectsHeaders, gitlabRequestTimeLimit)
	if statusCode != http.StatusOK || err != nil {
		return "", errors.New("error in get request to get branches")
	}
	type Branch struct {
		Name    string `json:"name"`
		Default bool   `json:"default"`
	}
	var branches []Branch
	json.Unmarshal(out, &branches)
	for _, branch := range branches {
		if branch.Default {
			return branch.Name, nil
		}
	}
	return "", errors.New("no default branch found")
}
