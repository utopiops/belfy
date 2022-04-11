package rds

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/config"
	"gitlab.com/utopiops-water/relational-database-sql-tool/models"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description stores some information of a specific database server on our system
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Success 200 {array} string "ok"
// @Router /rds/environment/name/{env_name}/database/name/{db_name}/settings [post]
func (controller *RDSController) SetDatabaseSettings(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

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
		// Check if the settings is already added
		isEnabled, err := settingsStore.IsEnabled(noContext, accountID, environmentName, databaseName)

		if err != nil {
			fmt.Println(err.Error())
			c.Status(http.StatusInternalServerError)
			return
		}
		if isEnabled {
			c.JSON(http.StatusBadRequest, &shared.ErrorResponse{
				Code:  http.StatusBadRequest,
				Title: "SQL Query Tool is already enabled for this database",
			})
			return
		}
		// Get the database details
		kindReqUrl := fmt.Sprintf("%s/v3/database/environment/name/%s/database/name/%s/tf", config.Configs.Endpoints.Core, environmentName, databaseName)
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
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, kindReqUrl, nil, headers, 0)
		if err != nil || statusCode != http.StatusOK {
			c.Status(http.StatusBadRequest)
			return
		}
		var detailsDto struct {
			Kind   string `json:"kind"`
			Region string `json:"region"`
			Engine string `json:"engine"`
		}
		err = json.Unmarshal(out, &detailsDto)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		fmt.Println(detailsDto)
		if detailsDto.Kind != "rds" {
			c.JSON(http.StatusBadRequest, &shared.ErrorResponse{
				Code:  http.StatusBadRequest,
				Title: "Invalid database kind",
			})
		}
		// Get Lambda function name
		lambdaUrl := fmt.Sprintf("%s/v3/database/environment/name/%s/database/name/%s/resources", config.Configs.Endpoints.Core, environmentName, databaseName)
		out, err, statusCode, _ = httpHelper.HttpRequest(http.MethodGet, lambdaUrl, nil, headers, 0)
		if err != nil || statusCode != http.StatusOK {
			c.Status(http.StatusBadRequest)
			return
		}
		var lambdaDto struct {
			LambdaFunctionName map[string]string `json:"query_lambda_function_name"`
		}
		err = json.Unmarshal(out, &lambdaDto)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}

		// Add the settings to the database
		rdsSettings := models.RDSSetting{
			AccountID:       accountID,
			EnvironmentName: c.Param("env_name"),
			DatabaseName:    c.Param("db_name"),
			LambdaName:      lambdaDto.LambdaFunctionName["value"],
			Region:          detailsDto.Region,
			Engine:          detailsDto.Engine,
		}

		err = settingsStore.SetRDSDatabaseSettings(noContext, &rdsSettings)

		if err != nil {
			// todo: delete the lambda just created
			fmt.Println(err.Error())
			if err.Error() == "Database query tool is already enabled for the application" {
				c.JSON(http.StatusBadRequest, gin.H{"errors": []shared.ErrorResponse{{
					Code:  http.StatusBadRequest,
					Title: "Database query tool is already enabled for the application",
				}}})
				return
			}
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	}
}
