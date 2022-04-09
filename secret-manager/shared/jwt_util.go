package shared

import (
	"errors"

	"github.com/dgrijalva/jwt-go"
	"gitlab.com/utopiops-water/secret-manager/config"
)

func GetAccountId(tokenString string) (string, error) {
	claims, err := getClaims(tokenString)
	if err != nil {
		return "", err
	}
	if user, ok := claims["user"]; ok {
		if userMap, isUserMap := user.(map[string]interface{}); isUserMap {
			if accountId, hasAccountId := userMap["accountId"]; hasAccountId {
				if accountIdString, isAccountIdString := accountId.(string); isAccountIdString {
					return accountIdString, nil
				}
			}
		}
	}
	return "", errors.New("Claim not found")
}

func getClaims(tokenString string) (jwt.MapClaims, error) {
	secret := []byte(config.Configs.Secrets.AuthServerJwtSecret)

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("Invalid signature")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	} else {
		return nil, errors.New("Invalid token")
	}

}
