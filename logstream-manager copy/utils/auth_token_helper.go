package utils

import (
	"errors"
	"io/ioutil"
	"net/http"

	"gitlab.com/utopiops-water/logstream-manager/config"
)

type AuthTokenHelper struct {
	Tokens map[string]string
}

func (ath *AuthTokenHelper) Register() error {
	client := &http.Client{}

	url := config.Configs.Endpoints.Core + "/auth/apps/register"
	req, err := http.NewRequest("POST", url, nil)
	// todo: get from .env
	req.Header.Add("appName", config.Configs.Secrets.AppName)
	req.Header.Add("secret", config.Configs.Secrets.AppSecret)
	_, err = client.Do(req)
	return err
}

func (ath *AuthTokenHelper) GetToken(userId, accountId string) (string, error) {
	id := userId + "_" + accountId
	if token, ok := ath.Tokens[id]; ok {
		return token, nil
	}

	client := &http.Client{}
	url := config.Configs.Endpoints.Core + "/auth/apps/token"
	req, err := http.NewRequest("POST", url, nil)
	req.Header.Add("appName", "logstream-manager")
	req.Header.Add("secret", "secret")
	resp, err := client.Do(req)
	if err != nil {
		return "", errors.New(err.Error())
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", errors.New(err.Error())
	}
	token := string([]byte(body))

	ath.Tokens[id] = token
	return token, nil
}
