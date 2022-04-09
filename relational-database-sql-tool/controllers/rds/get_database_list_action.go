package rds

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/relational-database-sql-tool/config"
	"gitlab.com/utopiops-water/relational-database-sql-tool/shared"
	"gitlab.com/utopiops-water/relational-database-sql-tool/stores"
)

// @Description get list of all databases for a specific database server
// @Param env_name path string true "name of user environment in our system"
// @Param db_name path string true "name of user's database server"
// @Param dto body RDSQuery true "username, password and default database name are necessary to get list of databases"
// @Success 200 {array} string "ok"
// @Router /rds/environment/name/{env_name}/database/name/{db_name}/list_db [post]
func (controller *RDSController) GetDatabaseList(httpHelper shared.HttpHelper, settingsStore stores.SettingsStore) gin.HandlerFunc {
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

		dto := RDSQuery{}
		// Get defualt database name
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
		dbNameUrl := fmt.Sprintf("%s/v3/database/environment/name/%s/database/name/%s/resources", config.Configs.Endpoints.Core, environmentName, databaseName)
		out, err, statusCode, _ := httpHelper.HttpRequest(http.MethodGet, dbNameUrl, nil, headers, 0)
		if err != nil || statusCode != http.StatusOK {
			c.Status(http.StatusBadRequest)
			return
		}
		var dbNameDto struct {
			InitialDbName map[string]string `json:"initial_db_name"`
		}
		err = json.Unmarshal(out, &dbNameDto)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}

		if err := c.ShouldBindJSON(&dto); err != nil {
			c.JSON(http.StatusBadRequest, shared.ErrorResponse{
				Code:    http.StatusBadRequest,
				Title:   "Invalid body in the message",
				Details: err.Error(),
			})
			return
		}
		dto.Database = dbNameDto.InitialDbName["value"]

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
			inputs.Query.Statement = getDatabaseListPostgresQuery
		case "mysql":
			inputs.Query.Statement = getDatabaseListMysqlQuery
		case "mariadb":
			inputs.Query.Statement = getDatabaseListMariadbQuery
		case "sqlserver-ex", "sqlserver-ee", "sqlserver-se", "sqlserver-web":
			inputs.Query.Statement = getDatabaseListSqlserverQuery
		}
		ExecuteGeneralQuery(inputs)

	}

}

var getDatabaseListPostgresQuery = `
SELECT datname 
FROM   pg_database;
`

var getDatabaseListMysqlQuery = `
SELECT schema_name as database_name
FROM   information_schema.schemata;
`

var getDatabaseListMariadbQuery = `
SELECT schema_name as database_name
FROM   information_schema.schemata;
`

var getDatabaseListSqlserverQuery = `
SELECT name 
FROM   master.sys.databases;
`
