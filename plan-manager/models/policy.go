package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

type AddPolicyDto struct {
	Name       string      `json:"name" binding:"required"`
	Service    *string     `json:"service" binding:"required"`
	Statements []Statement `json:"statements"`
}

type Statements []Statement

func (s Statements) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *Statements) Scan(value interface{}) error {
	data, ok := value.([]byte)
	if !ok {
		return errors.New("can't convert value to []byte")
	}
	return json.Unmarshal(data, s)
}

type Statement struct {
	Name     string   `json:"name"`
	Resource string   `json:"resource"` // A string or regex
	Actions  []string `json:"actions"`  // A string or regex
	Effect   string   `json:"effect"`   // Only allow and deny accepted
}

func (s Statement) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *Statement) Scan(value interface{}) error {
	data, ok := value.([]byte)
	if !ok {
		return errors.New("can't convert value to []byte")
	}
	return json.Unmarshal(data, s)
}
