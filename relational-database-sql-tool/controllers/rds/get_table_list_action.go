package rds

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description get list of all tables for a specific database
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Param dto body RDSQuery true "username, password and database name are necessary to get list of tables"
// @Success 200 {array} string "ok"
// @Router /rds/environment/name/{env_name}/database/name/{db_name}/list_table [post]
func (controller *RDSController) GetTableList(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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
			inputs.Query.Statement = getTableListPostgresQuery
		case "mysql":
			inputs.Query.Statement = fmt.Sprintf(getTableListMysqlQuery, dto.Database)
		case "mariadb":
			inputs.Query.Statement = fmt.Sprintf(getTableListMariadbQuery, dto.Database)
		case "sqlserver-ex", "sqlserver-ee", "sqlserver-se", "sqlserver-web":
			inputs.Query.Statement = fmt.Sprintf(getTableListSqlserverQuery, dto.Database)
		}
		ExecuteGeneralQuery(inputs)

	}

}

var getTableListPostgresQuery = `
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
ORDER  BY table_name;
`

var getTableListMysqlQuery = `
SELECT table_name 
FROM   information_schema.tables 
WHERE  table_type = 'base table' AND table_schema='%s';
`

var getTableListMariadbQuery = `
SELECT table_name 
FROM   information_schema.tables 
WHERE  table_type = 'base table' AND table_schema='%s';
`

var getTableListSqlserverQuery = `
SELECT TABLE_NAME
FROM   %s.INFORMATION_SCHEMA.TABLES
WHERE  TABLE_TYPE = 'BASE TABLE';
`
