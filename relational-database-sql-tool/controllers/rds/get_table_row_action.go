package rds

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description get top 100 rows of a specific table
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Param dto body RDSQuery true "username, password, database name and table name are necessary to get top 100 rows of a table"
// @Success 200 {array} string "ok"
// @Router /rds/environment/name/{env_name}/database/name/{db_name}/get_table_rows [post]
func (controller *RDSController) GetTableRows(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		// Fill statement field according to database engine
		switch settings.Engine {
		case "postgres":
			inputs.Query.Statement = fmt.Sprintf(getTableRowPostgresQuery, dto.Table)
		case "mysql":
			inputs.Query.Statement = fmt.Sprintf(getTableRowMysqlQuery, dto.Table)
		case "mariadb":
			inputs.Query.Statement = fmt.Sprintf(getTableRowMariadbQuery, dto.Table)
		case "sqlserver-ex", "sqlserver-ee", "sqlserver-se", "sqlserver-web":
			inputs.Query.Statement = fmt.Sprintf(getTableRowSqlserverQuery, dto.Table)
		}
		ExecuteGeneralQuery(inputs)

	}

}

var getTableRowPostgresQuery = `SELECT * FROM %s LIMIT 100;`

var getTableRowMysqlQuery = `SELECT * FROM %s LIMIT 100;`

var getTableRowMariadbQuery = `SELECT * FROM %s LIMIT 100;`

var getTableRowSqlserverQuery = `SELECT TOP 100 * FROM %s`
