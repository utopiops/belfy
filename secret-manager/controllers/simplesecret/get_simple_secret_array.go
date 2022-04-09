package simplesecret

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/config"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) GetSimpleSecretArrayMode(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var dto simpleSecretArrayDto
		if err := c.ShouldBindJSON(&dto); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "accountId doesn't exist in context"})
			return
		}
		accountID := accountIdInterface.(string)

		secrets := make(map[string]string)
		for _, name := range dto.Names {
			secret, err := simpleSecretStore.GetSimpleSecret(noContext, accountID, name)
			if err != nil {
				if err.Error() == "sql: no rows in result set" {
					c.JSON(http.StatusNotFound, gin.H{"error": "some/all of secrets not found"})
					return
				}
				fmt.Println(err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			secret.Value, err = decrypt(secret.Value, config.Configs.Secrets.SimpleSecretPassPhrase)
			if err != nil {
				fmt.Println(err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			secrets[secret.Name] = secret.Value
		}

		c.JSON(http.StatusOK, secrets)
	}
}

type simpleSecretArrayDto struct {
	Names []string `json:"names"`
}
