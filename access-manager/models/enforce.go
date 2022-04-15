package models

type EnforceDto struct {
	UserID   string `json:"userId"`
	Resource string
	Action   string
}
