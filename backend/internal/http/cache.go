package http

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	redis "github.com/redis/go-redis/v9"
)

type cacheItem struct {
	value      string
	expiration int64 // Unix nano
}

type Cache struct {
	rdb   *redis.Client
	mu    sync.RWMutex
	items map[string]cacheItem
}

func NewCache(rdb *redis.Client) *Cache {
	c := &Cache{
		rdb:   rdb,
		items: make(map[string]cacheItem),
	}

	if rdb != nil {
		// Try to PING redis to ensure it's actually responding
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("Warning: Redis is configured but not responding to PING: %v", err)
		} else {
			log.Printf("Cache initialized with responding Redis backend")
		}
	} else {
		log.Printf("Cache initialized without Redis backend")
	}

	return c
}

func (c *Cache) Get(ctx context.Context, key string) (string, error) {
	// 1. Check in-memory cache
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()

	if found {
		if time.Now().UnixNano() < item.expiration {
			return item.value, nil
		}
		// Expired: remove it (async to avoid blocking read)
		go c.DelLocal(key)
	}

	// 2. Check Redis
	if c.rdb == nil {
		return "", fmt.Errorf("redis unavailable")
	}

	val, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		return "", err
	}

	// 3. Update in-memory cache
	// Get the TTL from Redis to preserve it in memory
	ttl, err := c.rdb.TTL(ctx, key).Result()
	if err == nil && ttl > 0 {
		c.SetLocal(key, val, ttl)
	} else {
		// Default TTL for items fetched from Redis if TTL is unknown or negative
		c.SetLocal(key, val, 5*time.Minute)
	}

	return val, nil
}

func (c *Cache) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	// Update in-memory cache
	c.SetLocal(key, value, ttl)

	// Update Redis - don't suffer if it doesn't respond
	if c.rdb == nil {
		return nil
	}

	// Use a goroutine to update Redis asynchronously so the request doesn't block
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		err := c.rdb.Set(bgCtx, key, value, ttl).Err()
		if err != nil {
			log.Printf("Async Redis Set failed for key %s: %v", key, err)
		}
	}()

	return nil
}

func (c *Cache) Del(ctx context.Context, key string) error {
	// Remove from in-memory
	c.DelLocal(key)

	// Try to remove from Redis
	if c.rdb == nil {
		return nil
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		err := c.rdb.Del(bgCtx, key).Err()
		if err != nil {
			log.Printf("Async Redis Del failed for key %s: %v", key, err)
		}
	}()

	return nil
}

func (c *Cache) SetLocal(key string, value string, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(ttl).UnixNano(),
	}
}

func (c *Cache) DelLocal(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}
