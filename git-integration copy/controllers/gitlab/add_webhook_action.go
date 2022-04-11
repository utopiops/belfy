package gitlab

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/config"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

func (controller *GitlabController) AddWebhook(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		authHeader := ctx.Request.Header.Get("Authorization")

		setSettingsDto := settingsDto{}
		if err := ctx.ShouldBindJSON(&setSettingsDto); err != nil || setSettingsDto.IntegrationName == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "integrationName and projectId are required",
			}}})
			return
		}

		var integration *resolvedIntegration
		var err error
		integration, err = GetIntegrationDetails(setSettingsDto.IntegrationName, authHeader, httpHelper, ctx, settingsStore)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{
				"err": "invalid integration name",
			})
			return
		}

		// Get a list of project hooks
		// SEE: https://docs.gitlab.com/ee/api/projects.html#list-project-hooks
		listWebhooksUrl := fmt.Sprintf("%s/api/v4/projects/%s/hooks", integration.Url, setSettingsDto.ProjectID)
		listWebhooksHeaders := []shared.Header{
			{
				Key:   "Authorization",
				Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
			},
		}
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, listWebhooksUrl, nil, listWebhooksHeaders, 0)
		if err != nil || statusCode != http.StatusOK {
			log.Println(err.Error())
			ctx.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "can't get list of webhooks from gitlab",
			}}})
			return
		}

		type webhook struct {
			ID        int    `json:"id"`
			Url       string `json:"url"`
			CreatedAt string `json:"created_at"`
			ProjectID int    `json:"project_id"`
		}
		webhooks := []webhook{}
		err = json.Unmarshal(out, &webhooks)
		if err != nil {
			log.Println(err.Error())
			ctx.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "can't unmarshal list of webhooks",
			}}})
			return
		}
		for _, hook := range webhooks {
			if fmt.Sprint(hook.ProjectID) == setSettingsDto.ProjectID && hook.Url == config.Configs.Endpoints.GitlabWebhookUrl {
				log.Println("webhook already added for this project")
				ctx.JSON(http.StatusOK, gin.H{
					"OK": "webhook already added for this project",
				})
				return
			}
		}

		// SEE: https://docs.gitlab.com/ee/api/projects.html#add-project-hook
		addWebhookUrl := fmt.Sprintf("%s/api/v4/projects/%s/hooks?url=%s&token=%s", integration.Url, setSettingsDto.ProjectID,
			config.Configs.Endpoints.GitlabWebhookUrl, config.Configs.Secrets.GitlabWebhookSecret)
		addWebhookHeaders := []shared.Header{
			{
				Key:   "Authorization",
				Value: fmt.Sprintf("Bearer %s", integration.AccessToken),
			},
		}
		out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodPost, addWebhookUrl, nil, addWebhookHeaders, 0)
		if err != nil || statusCode != http.StatusCreated {
			log.Println("response:", string(out))
			log.Println("statusCode:", statusCode)
			if err != nil {
				log.Println("err:", err)
			}
			ctx.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
				Code:    http.StatusBadRequest,
				Details: "can't add webhook to this project",
			}}})
			return
		}

		ctx.Status(http.StatusOK)
	}
}
