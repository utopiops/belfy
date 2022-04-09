package simplesecret

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/config"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) GetSimpleSecretValue(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
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

		name := c.Param("name")
		secretValue, err := simpleSecretStore.GetSimpleSecretValue(noContext, accountID, name)
		if err != nil {
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		decryptedValue, err := decrypt(secretValue, config.Configs.Secrets.SimpleSecretPassPhrase)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}

		c.String(http.StatusOK, decryptedValue)
	}
}

func (controller *SimpleSecretController) GetSimpleSecretValueForInternal(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the account ID from the token and use it build the policy segments
		accountId := c.Param("accountId")
		if accountId == "" {
			c.Status(http.StatusBadRequest)
			return
		}

		name := c.Param("name")
		secretValue, err := simpleSecretStore.GetSimpleSecretValue(noContext, accountId, name)
		if err != nil {
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		decryptedValue, err := decrypt(secretValue, config.Configs.Secrets.SimpleSecretPassPhrase)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}

		c.String(http.StatusOK, decryptedValue)
	}
}
