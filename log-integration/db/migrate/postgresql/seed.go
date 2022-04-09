package postgresql

import (
	"database/sql"
	"log"
)

// We don't have any seeds at the moment. The seeds are sql statements
var seeds = []string{}

func Seed(db *sql.DB) error {
	for _, seed := range seeds {
		log.Println(seed)
		if _, err := db.Exec(seed); err != nil {
			return err
		}
	}
	return nil
}
