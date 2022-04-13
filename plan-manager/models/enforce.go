package models

type EnforceDto struct {
	Resource string `json:"resource" binding:"required"`
	Action   string `json:"action" binding:"required"`
}
