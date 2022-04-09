package gitlab

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/dgraph-io/ristretto"
	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/config"
	"gitlab.com/utopiops-water/git-integration/shared"
	"gitlab.com/utopiops-water/git-integration/stores"
)

const (
	gitlabRequestTimeLimit time.Duration = 10 * time.Second
)

type GitlabController struct {
	Cache *ristretto.Cache
}

var noContext = context.Background()

type resolvedIntegration struct {
	Url         string
	AccessToken string
}

func GetIntegrationDetails(integrationName, authHeader string, httpHelper shared.HttpHelper, c *gin.Context, settingsStore stores.SettingsStore) (resolved *resolvedIntegration, err error) {
	// Get the access token and url
	method := http.MethodGet
	url := config.Configs.Endpoints.Core + fmt.Sprintf("/integration/%s", integrationName)
	headers := []shared.Header{
		{
			Key:   "Authorization",
			Value: authHeader, // We just pass on the user's token
		},
	}
	idToken, err := c.Cookie("id_token")
	/*if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}*/
	if err == nil {
		headers = append(headers, shared.Header{
			Key:   "Cookie",
			Value: fmt.Sprintf("id_token=%s", idToken),
		})
	}
	out, err, statusCode, _ := httpHelper.HttpRequest(method, url, nil, headers, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("Failed to get integration")
		return
	}
	var integration struct {
		Url       string `json:"url"`
		TokenName string `json:"tokenName"`
		Service   string `json:"service"`
	}
	err = json.Unmarshal(out, &integration)
	if err != nil {
		err = errors.New("Failed to unmarshal integration")
		return
	}

	// Get the access/refresh token's value
	secretValueUrl := fmt.Sprintf("%s/simple/%s/value", config.Configs.Endpoints.SecretManager, integration.TokenName)
	secretValueHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: authHeader, // We just pass on the user's token
		},
	}
	idToken, err = c.Cookie("id_token")
	/*if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}*/
	if err == nil {
		secretValueHeaders = append(secretValueHeaders, shared.Header{
			Key:   "Cookie",
			Value: fmt.Sprintf("id_token=%s", idToken),
		})
	}
	out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodGet, secretValueUrl, nil, secretValueHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("Failed to get access token")
		return
	}
	token := string(out)
	success := true
	// if service of integration is gitlab_oauth then token is a refresh token
	if integration.Service == "gitlab_oauth" {
		success = false
		for i := 0; i < 20; i++ {
			accountIdInterface, exists := c.Get("accountId")
			if !exists {
				c.Status(http.StatusBadRequest)
				return
			}
			accountID := accountIdInterface.(string)
			redisKey := "gi|" + accountID + "|" + integrationName
			exist, value, redisErr := settingsStore.GetRedisPairValue(redisKey)
			if redisErr != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"err": redisErr.Error(),
				})
				return nil, redisErr
			}
			if exist && value != "" && value != "pending" {
				log.Println("access token already exist")
				log.Println("value:", value)
				token = value
				success = true
				break
			}
			if value == "pending" {
				log.Println("wait until updating of refresh token end")
				time.Sleep(500 * time.Millisecond)
				continue
			}
			if !exist {
				redisErr := settingsStore.SetRedisPair(redisKey, "pending", 30*time.Second)
				log.Println("trying to update refresh token")
				if redisErr != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"err": redisErr.Error(),
					})
					return nil, redisErr
				}

				refreshUrl := config.Configs.Endpoints.GitlabTokenUrl
				refreshUrl += "?refresh_token=" + token
				refreshUrl += "&grant_type=refresh_token"
				refreshUrl += "&client_id=" + config.Configs.Secrets.GitlabClientId
				refreshUrl += "&client_secret=" + config.Configs.Secrets.GitlabClientSecret
				refreshUrl += "&redirect_uri=" + config.Configs.Endpoints.GitlabRedirectUrl

				refreshTokensHeaders := []shared.Header{
					{
						Key:   "Accept",
						Value: "application/json",
					},
				}
				out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodPost, refreshUrl, nil, refreshTokensHeaders, 0)
				if err != nil || statusCode != http.StatusOK {
					err = errors.New("failed to get gitlab oauth tokens")
					continue
				}

				var tokens struct {
					AccessToken  string `json:"access_token"`
					RefreshToken string `json:"refresh_token"`
					ExpiresIn    int64  `json:"expires_in"`
				}
				err = json.Unmarshal(out, &tokens)
				if err != nil || tokens.AccessToken == "" || tokens.RefreshToken == "" {
					err = errors.New("failed to get gitlab oauth tokens")
					continue
				}

				err = updateSecret(integration.TokenName, tokens.RefreshToken, authHeader, httpHelper, c)
				if err != nil {
					err = errors.New("failed to update refresh token")
					continue
				}
				token = tokens.AccessToken
				redisErr = settingsStore.SetRedisPair(redisKey, token, time.Duration(tokens.ExpiresIn)*time.Second-time.Minute)
				if redisErr != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"err": redisErr.Error(),
					})
					return nil, redisErr
				}
				success = true
				break
			}
		}
	}
	if !success {
		err = errors.New("failed in process of get/update gitlab oauth tokens")
		return
	}
	resolved = &resolvedIntegration{
		Url:         integration.Url,
		AccessToken: token,
	}
	return

}

func updateSecret(tokenName, newValue, authHeader string, httpHelper shared.HttpHelper, c *gin.Context) (err error) {
	secretUrl := fmt.Sprintf("%s/simple/%s", config.Configs.Endpoints.SecretManager, tokenName)
	secretHeaders := []shared.Header{
		{
			Key:   "Authorization",
			Value: authHeader, // We just pass on the user's token
		},
		{
			Key:   "Content-Type",
			Value: "application/json",
		},
	}
	idToken, err := c.Cookie("id_token")
	/*if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}*/
	if err == nil {
		secretHeaders = append(secretHeaders, shared.Header{
			Key:   "Cookie",
			Value: fmt.Sprintf("id_token=%s", idToken),
		})
	}
	_, err, statusCode, _ := httpHelper.HttpRequest(http.MethodDelete, secretUrl, nil, secretHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("failed to delete token")
		return
	}

	secretUrl = fmt.Sprintf("%s/simple", config.Configs.Endpoints.SecretManager)
	var secretBody = struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Value       string `json:"value"`
	}{
		Name:        tokenName,
		Description: "Default Gitlab refresh token",
		Value:       newValue,
	}
	secretBodyBytes, _ := json.Marshal(secretBody)
	_, err, statusCode, _ = httpHelper.HttpRequest(http.MethodPost, secretUrl, bytes.NewBuffer(secretBodyBytes), secretHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("failed to update token")
		return
	}

	return nil
}
