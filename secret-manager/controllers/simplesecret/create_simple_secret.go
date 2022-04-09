package simplesecret

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/secret-manager/config"
	"gitlab.com/utopiops-water/secret-manager/models"
	"gitlab.com/utopiops-water/secret-manager/stores"
)

func (controller *SimpleSecretController) CreateSimpleSecret(simpleSecretStore stores.SimpleSecretStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var dto simpleSecretDto
		if err := c.ShouldBindJSON(&dto); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

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
		// TODO: Add validation

		ciphered, err := encrypt(dto.Value, config.Configs.Secrets.SimpleSecretPassPhrase)

		if err != nil {
			log.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}

		secret := models.SimpleSecret{
			Name:        dto.Name,
			Description: dto.Description,
			AccountID:   accountID,
			Value:       ciphered,
		}

		err = simpleSecretStore.CreateSimpleSecret(noContext, &secret)
		if err != nil {
			log.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}
}

type simpleSecretDto struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Value       string `json:"value"`
}
