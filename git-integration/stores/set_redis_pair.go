package stores

import (
	"time"
)

// Set a key-value pair with time-to-live in redis
// zero ttl means the key has no expiration time
func (store *settingsStore) SetRedisPair(key, value string, ttl time.Duration) (err error) {
	err = store.redisClient.Set(key, value, ttl).Err()
	return
}
