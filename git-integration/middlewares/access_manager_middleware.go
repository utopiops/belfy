package middlewares

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/config"
	"gitlab.com/utopiops-water/git-integration/models"
	"gitlab.com/utopiops-water/git-integration/shared"
)

const (
	accessManagerRequestTimeLimit time.Duration = 10 * time.Second
)

func Authorize(resource, action string, params ...models.AuthorizeResource) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		return
		for _, param := range params {
			var value string
			if param.Type == "param" {
				value = c.Param(param.Key)
			} else if param.Type == "query" {
				value = c.Query(param.Key)
			}
			resource += "/" + value
		}
		httpHelper := shared.NewHttpHelper(shared.NewHttpClient())
		authHeader := c.Request.Header.Get("Authorization")
		tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		userId, err := shared.GetUserId(tokenString)
		if err != nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		url := fmt.Sprintf("%s/policy/enforce", config.Configs.Endpoints.AccessManager)
		headers := []shared.Header{
			{
				Key:   "Authorization",
				Value: authHeader,
			},
		}
		data := AccessManagerRequest{
			UserID:   userId,
			Resource: resource,
			Action:   action,
		}
		json_data, err := json.Marshal(data)
		if err != nil {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		body := bytes.NewBuffer(json_data)
		response, err, status, _ := httpHelper.HttpRequest(http.MethodPost, url, body, headers, accessManagerRequestTimeLimit)
		if err != nil || status != http.StatusOK {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		var res AccessManagerResponse
		if err := json.Unmarshal(response, &res); err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		if res.Allowed {
			c.Next()
			return
		}
		c.AbortWithStatus(http.StatusMethodNotAllowed)
	}
}

type AccessManagerRequest struct {
	UserID   string `json:"userId"`
	Resource string `json:"resource"`
	Action   string `json:"action"`
}
type AccessManagerResponse struct {
	Allowed bool `json:"allowed"`
}
