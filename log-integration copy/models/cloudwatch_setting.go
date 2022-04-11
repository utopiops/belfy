package models

type CloudwatchSetting struct {
	ID     int    `db:"id"`
	Region string `json:"region" db:"region"`
}
