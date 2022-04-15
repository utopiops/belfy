package models

import "fmt"

type Action string

const (
	BuyPlan     Action = "buy_plan"
	BuyUser            = "buy_user"
	BuyPack            = "buy_pack"
	PayInvoice         = "pay_invoice"
	UpgradePlan        = "upgrade_plan"
)

type CreateCustomer struct {
	AccountId string            `json:"account_id"`
	Email     *string           `json:"email"`
	Name      *string           `json:"name"`
	Username  *string           `json:"username"`
	Phone     *string           `json:"phone"`
	MetaData  map[string]string `json:"meta_data"`
}

type PaymentSecrets struct {
	PublishableKey string `json:"publisable_key"`
	SecretKey      string `json:"secret_key"`
}

type Item struct {
	Name       string  `json:"name"`
	Quantity   int64   `json:"quantity"`
	UnitAmount float64 `json:"unit_amount"` //in cents
}

type CreateInvoiceDto struct {
	AccountId     string            `json:"account_id"`
	PaymentMethod *string           `json:"Payment_method"`
	PromotionCode *string           `json:"promotion_code"`
	Description   string            `json:"description"`
	Items         []Item            `json:"items"`
	Details       map[string]string `json:"details"`
}

type ChargeError struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

func (e ChargeError) Error() string {
	return fmt.Sprintf("Charge Error, Code: %s, Message: %s", e.Code, e.Message)
}
