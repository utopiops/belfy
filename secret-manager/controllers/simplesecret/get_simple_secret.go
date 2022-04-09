package simplesecret

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/config"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) GetSimpleSecret(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
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
		secret, err := simpleSecretStore.GetSimpleSecret(noContext, accountID, name)

		if err != nil {
			if err.Error() == "sql: no rows in result set" {
				c.Status(http.StatusNotFound)
				return
			}
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		secret.Value, err = decrypt(secret.Value, config.Configs.Secrets.SimpleSecretPassPhrase)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		c.JSON(http.StatusOK, gin.H{"secret": secret})
	}
}
