package postgresql

import (
	"database/sql"
	"fmt"
	"log"

	"gitlab.com/utopiops-water/plan-manager/models"
)

var fee = 1

// We don't have any seeds at the moment. The seeds are sql statements
var seeds = []string{}

func init() {
	var addDefaultApp = `
insert into application_size(name, fee)
values('%s', %d)
on conflict do nothing;`
	for _, size := range models.GetApplicationsSize() {
		stmt := fmt.Sprintf(addDefaultApp, size, fee)
		seeds = append(seeds, stmt)
	}
}

func Seed(db *sql.DB) error {
	log.Println("appling seeds")
	for _, seed := range seeds {
		log.Println(seed)
		if _, err := db.Exec(seed); err != nil {
			return err
		}
	}
	return nil
}
