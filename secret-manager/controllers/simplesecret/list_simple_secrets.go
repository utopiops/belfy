package simplesecret

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) ListSimpleSecrets(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		// Get the account ID from the token and use it build the policy segments
		// authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.Status(http.StatusBadRequest)
			return
		}
		accountID := accountIdInterface.(string)

		secrets, err := simpleSecretStore.ListSimpleSecrets(noContext, accountID)
		filteredSecrets := make([]struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}, 0)
		for _, secret := range secrets {
			if secret.Name == "default_gitlab_refresh_token" ||
				secret.Name == "default_github_refresh_token" ||
				secret.Name == "default_bitbucket_refresh_token" {
				continue
			}
			filteredSecrets = append(filteredSecrets, secret)
		}
		secrets = filteredSecrets

		fmt.Println("secrets: ", secrets)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{"secrets": secrets})
	}
}
