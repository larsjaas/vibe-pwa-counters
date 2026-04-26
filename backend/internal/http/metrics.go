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
)
