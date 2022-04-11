package settings

import (
	"bytes"
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

type queryString struct {
	IntegrationName string `form:"integration_name"`
}

func (controller *SettingsController) RetrieveAccessToken(settingsStore stores.SettingsStore, httpHelper shared.HttpHelper) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.Request.Header.Get("Authorization")

		tokenType, exists := c.Get("tokenType")
		if !exists || tokenType != "internal" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "access token type is invalid",
			})
			return
		}
		accountId := c.Param("account_id")

		var qs queryString
		if c.ShouldBindQuery(&qs) != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		tokenName := qs.IntegrationName + "_refresh_token"
		method := http.MethodGet
		url := config.Configs.Endpoints.SecretManager + fmt.Sprintf("/simple/%s/value/accountId/%s", tokenName, accountId)
		headers := []shared.Header{
			{
				Key:   "Authorization",
				Value: authHeader,
			},
		}
		out, err, statusCode, _ := httpHelper.HttpRequest(method, url, nil, headers, 0)
		if err != nil || statusCode != http.StatusOK {
			err = errors.New("failed to get refresh token")
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return
		}
		refreshToken := string(out)

		if strings.Contains(tokenName, "github") {
			accessToken, err := getGithubAccessToken(tokenName, refreshToken, authHeader, accountId, qs.IntegrationName, httpHelper, settingsStore)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "can not get tokens from github",
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"access_token": accessToken,
				"git_service":  "github",
			})
			return
		} else if strings.Contains(tokenName, "gitlab") {
			accessToken, err := getGitlabAccessToken(tokenName, refreshToken, authHeader, accountId, qs.IntegrationName, httpHelper, settingsStore)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "can not get tokens from gitlab",
				})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"access_token": accessToken,
				"git_service":  "gitlab",
			})
			return
		}

	}
}

func getGithubAccessToken(tokenName, refreshToken, authHeader, accountId, integrationName string, httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) (accessToken string, err error) {
	success := false
	for i := 0; i < 20; i++ {
		redisKey := "gi|" + accountId + "|" + integrationName
		exist, value, redisErr := settingsStore.GetRedisPairValue(redisKey)
		if redisErr != nil {
			return "", redisErr
		}
		if exist && value != "" && value != "pending" {
			log.Println("access token already exist")
			log.Println("value:", value)
			accessToken = value
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
				return "", redisErr
			}
			refreshUrl := config.Configs.Endpoints.GithubTokenUrl
			refreshUrl += "?refresh_token=" + refreshToken
			refreshUrl += "&grant_type=refresh_token"
			refreshUrl += "&client_id=" + config.Configs.Secrets.GithubClientId
			refreshUrl += "&client_secret=" + config.Configs.Secrets.GithubClientSecret

			refreshTokensHeaders := []shared.Header{
				{
					Key:   "Accept",
					Value: "application/json",
				},
			}
			out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodPost, refreshUrl, nil, refreshTokensHeaders, 0)
			if err != nil || statusCode != http.StatusOK {
				err = errors.New("failed to get github oauth tokens")
				continue
			}

			var tokens struct {
				AccessToken  string `json:"access_token"`
				RefreshToken string `json:"refresh_token"`
				ExpiresIn    int64  `json:"expires_in"`
			}
			err = json.Unmarshal(out, &tokens)
			if err != nil || tokens.AccessToken == "" || tokens.RefreshToken == "" {
				err = errors.New("failed to get github oauth tokens")
				continue
			}

			err = updateSecret(tokenName, tokens.RefreshToken, authHeader, accountId, httpHelper)
			if err != nil {
				err = errors.New("failed to update refresh token")
				continue
			}
			accessToken = tokens.AccessToken
			redisErr = settingsStore.SetRedisPair(redisKey, accessToken, time.Duration(tokens.ExpiresIn)*time.Second-time.Minute)
			if redisErr != nil {
				return "", redisErr
			}
			success = true
			break
		}
	}
	if !success {
		err = errors.New("failed in process of get/update github oauth tokens")
		return
	}
	return
}

func getGitlabAccessToken(tokenName, refreshToken, authHeader, accountId, integrationName string, httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) (accessToken string, err error) {
	success := false
	for i := 0; i < 20; i++ {
		redisKey := "gi|" + accountId + "|" + integrationName
		exist, value, redisErr := settingsStore.GetRedisPairValue(redisKey)
		if redisErr != nil {
			return "", redisErr
		}
		if exist && value != "" && value != "pending" {
			log.Println("access token already exist")
			log.Println("value:", value)
			accessToken = value
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
				return "", redisErr
			}

			refreshUrl := config.Configs.Endpoints.GitlabTokenUrl
			refreshUrl += "?refresh_token=" + refreshToken
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
			out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodPost, refreshUrl, nil, refreshTokensHeaders, 0)
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

			err = updateSecret(tokenName, tokens.RefreshToken, authHeader, accountId, httpHelper)
			if err != nil {
				err = errors.New("failed to update refresh token")
				continue
			}
			accessToken = tokens.AccessToken
			redisErr = settingsStore.SetRedisPair(redisKey, accessToken, time.Duration(tokens.ExpiresIn)*time.Second-time.Minute)
			if redisErr != nil {
				return "", redisErr
			}
			success = true
			break
		}
	}
	if !success {
		err = errors.New("failed in process of get/update gitlab oauth tokens")
		return
	}
	return
}

func updateSecret(tokenName, newValue, authHeader, accountId string, httpHelper shared.HttpHelper) (err error) {
	secretUrl := fmt.Sprintf("%s/simple/%s?accountId=%s", config.Configs.Endpoints.SecretManager, tokenName, accountId)
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
	_, err, statusCode, _ := httpHelper.HttpRequest(http.MethodDelete, secretUrl, nil, secretHeaders, 0)
	if err != nil || statusCode != http.StatusOK {
		err = errors.New("failed to delete token")
		return
	}

	secretUrl = fmt.Sprintf("%s/simple?accountId=%s", config.Configs.Endpoints.SecretManager, accountId)
	var secretBody = struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Value       string `json:"value"`
	}{
		Name:        tokenName,
		Description: fmt.Sprintf("Default %s refresh token", strings.Split(tokenName, "_")[1]),
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
