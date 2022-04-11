package rds

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description execute user's query and return results
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Param dto body RDSQuery true "username, password, database name and statement are necessary to execute a user query"
// @Success 200 {array} string "ok"
// @Router /rds/environment/name/{env_name}/database/name/{db_name}/query [post]
func (controller *RDSController) ExecuteUserQuery(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		dto := RDSQuery{}

		if err := c.ShouldBindJSON(&dto); err != nil {
			c.JSON(http.StatusBadRequest, shared.ErrorResponse{
				Code:    http.StatusBadRequest,
				Title:   "Invalid body in the message",
				Details: err.Error(),
			})
			return
		}

		authHeader := c.Request.Header.Get("Authorization")
		// tokenString := strings.TrimSpace(strings.SplitN(authHeader, "Bearer", 2)[1])
		// accountID, err := shared.GetAccountId(tokenString)
		accountIdInterface, exists := c.Get("accountId")
		if !exists {
			c.Status(http.StatusBadRequest)
			return
		}
		accountID := accountIdInterface.(string)

		environmentName := c.Param("env_name")
		databaseName := c.Param("db_name")

		// Get the cloudwatch settings (should exist, o.w. bad request)
		settings, err := settingsStore.GetRDSDatabaseSettings(noContext, accountID, environmentName, databaseName)
		if err != nil {
			log.Println(err.Error())
			if err.Error() == "Not found" {
				c.Status(http.StatusBadRequest)
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}

		// Fill input parameters of ExecuteGeneralQuery function
		inputs := ExecuteGeneralQueryInputs{
			HttpHelper:      httpHelper,
			Context:         c,
			Settings:        settings,
			Query:           dto,
			AuthHeader:      authHeader,
			EnvironmentName: environmentName,
		}
		ExecuteGeneralQuery(inputs)

	}

}
