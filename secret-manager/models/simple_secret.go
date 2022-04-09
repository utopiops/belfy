package models

type SimpleSecret struct {
	ID          int    `db:"id" json:"-"`
	Name        string `db:"name"   json:"name"`
	Description string `db:"description"   json:"description"`
	AccountID   string `db:"account_id"   json:"accountId"`
	Value       string `db:"value"   json:"value"`
}
