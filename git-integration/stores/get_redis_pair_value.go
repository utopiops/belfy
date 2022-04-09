package stores

import "github.com/go-redis/redis"

func (store *settingsStore) GetRedisPairValue(key string) (exist bool, value string, err error) {
	rdb := store.redisClient
	value, err = rdb.Get(key).Result()
	if err != nil && err != redis.Nil {
		return
	}
	if err != nil && err == redis.Nil {
		err = nil
		exist = false
		return
	}
	exist = true
	return
}
