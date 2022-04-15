package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

type Plan struct {
	Json json.RawMessage
}

func (p Plan) Value() (driver.Value, error) {
	return json.Marshal(p.Json)
}

func (p *Plan) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &p.Json)
}

func (p Plan) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.Json)
}

func (p *Plan) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, &p.Json)
}

type Plans map[string]Plan

type PlanKind = string

const (
	Hobby        PlanKind = "hobby"
	FullyManaged          = "fully managed"
	Standard              = "standard"
	Premium               = "premium"
	Enterprise            = "enterprise"
)

var PlanKinds = []PlanKind{Hobby, FullyManaged, Standard, Premium, Enterprise}

func GetPlan(plan string) (PlanKind, error) {
	switch PlanKind(plan) {
	case Hobby:
	case FullyManaged:
	case Standard:
	case Premium:
	case Enterprise:
	default:
		return "", fmt.Errorf("plan %s not found", plan)
	}
	return PlanKind(plan), nil
}
