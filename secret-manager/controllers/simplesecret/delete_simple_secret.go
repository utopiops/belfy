package simplesecret

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) DeleteSimpleSecret(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the account ID from the token and use it build the policy segments
		// authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		tokenType, _ := c.Get("tokenType")
		var accountID string
		if tokenType == "internal" {
			type queryString struct {
				AccountId string `form:"accountId"`
			}
			var qs queryString
			err := c.ShouldBindQuery(&qs)
			if err != nil || qs.AccountId == "" {
				c.Status(http.StatusBadRequest)
				return
			}
			accountID = qs.AccountId
		} else if tokenType == "external" {
			accountIdInterface, exists := c.Get("accountId")
			if !exists {
				c.Status(http.StatusBadRequest)
				return
			}
			accountID = accountIdInterface.(string)
		}
		name := c.Param("name")

		err := simpleSecretStore.DeleteSimpleSecret(noContext, accountID, name)
		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}
}
