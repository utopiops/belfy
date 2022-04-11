package stores

import (
	"sort"

	"gitlab.com/utopiops-water/relational-database-sql-tool/db"
)

// get rows of migration_history table
func (store *settingsStore) GetMigrationHistoryRows() ([]string, error) {
	var res []string
	var statement string
	switch store.db.Driver {
	case db.Postgres:
		statement = "SELECT * FROM migration_history"
	}

	rows, err := store.db.Connection.Query(statement)

	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var nxt string
		rows.Scan(&nxt)
		res = append(res, nxt)
	}
	sort.Strings(res)
	return res, nil
}
