package health

import (
	"errors"
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"gitlab.com/utopiops-water/git-integration/db/migrate/postgresql"
	"gitlab.com/utopiops-water/git-integration/stores"
)

// get Migrations from postgresql package (relational-database-sql-tool/db/migrate/postgresql)
func GetMigrationHistoryNames() []string {
	var names []string
	for _, mig := range postgresql.Migrations {
		names = append(names, mig.Name)
	}
	sort.Strings(names)
	return names
}

// check that rows of migration_history table are equal with Migrations in postgresql package
func CheckMigrationHealth(store stores.SettingsStore) error {
	migrationHistoryNames := GetMigrationHistoryNames()
	migrationHistoryInDatabase, err := store.GetMigrationHistoryRows()
	if err != nil {
		return err
	}
	if len(migrationHistoryNames) != len(migrationHistoryInDatabase) {
		return errors.New("")
	}
	length := len(migrationHistoryNames)
	for i := 0; i < length; i++ {
		name := migrationHistoryNames[i]
		row := migrationHistoryInDatabase[i]
		if name != row {
			return errors.New("")
		}
	}
	return nil
}

func (jlc *HealthCheckController) GetStatus(store stores.SettingsStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		tables := []string{
			"application_service_provider",
			"gitlab_application_settings",
			"github_application_settings",
			"bitbucket_application_settings",
		}

		// check health of migration history
		err := CheckMigrationHealth(store)
		if err != nil {
			c.String(http.StatusInternalServerError, "Error: migration_history table is unhealthy!")
			return
		}

		for _, table := range tables {
			_, err := store.IsCreated(table)
			if err != nil {
				c.String(http.StatusInternalServerError, "Error: some table(s) of database are unhealthy!")
				return
			}
		}

		c.String(http.StatusOK, "healthy")
	}
}
