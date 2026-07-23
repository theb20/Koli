package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"

	"merchantgo/internal/utils"
)

// visitor associe un limiteur token-bucket par IP à sa dernière activité,
// pour permettre le nettoyage périodique des entrées inactives.
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter limite le débit de requêtes par adresse IP.
type IPRateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rps      rate.Limit
	burst    int
}

func NewIPRateLimiter(rps int, burst int) *IPRateLimiter {
	l := &IPRateLimiter{
		visitors: make(map[string]*visitor),
		rps:      rate.Limit(rps),
		burst:    burst,
	}
	go l.cleanupLoop()
	return l
}

func (l *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()

	v, exists := l.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(l.rps, l.burst)
		l.visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}
	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupLoop évite une fuite mémoire : sans ça, une entrée serait créée
// par IP vue depuis le démarrage du service, pour toujours.
func (l *IPRateLimiter) cleanupLoop() {
	for {
		time.Sleep(time.Minute)
		l.mu.Lock()
		for ip, v := range l.visitors {
			if time.Since(v.lastSeen) > 10*time.Minute {
				delete(l.visitors, ip)
			}
		}
		l.mu.Unlock()
	}
}

// RateLimit applique le token-bucket par IP à chaque requête.
func RateLimit(limiter *IPRateLimiter, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.getLimiter(ip).Allow() {
			RespondError(c, logger, utils.ErrTooManyRequests("Trop de requêtes, réessayez plus tard"))
			c.Abort()
			return
		}
		c.Next()
	}
}
