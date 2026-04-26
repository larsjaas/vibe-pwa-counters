package http

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	activeSSEClients = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "counters_active_sse_clients",
		Help: "The total number of active SSE connections.",
	})

	sessionCount = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "counters_sessions",
		Help: "The total number of active sessions in Redis.",
	})

	UserCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "counters_users_total",
		Help: "The total number of users created.",
	})

	UsersDeletedCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "counters_users_deleted_total",
		Help: "The total number of users deleted (anonymized).",
	})
)
