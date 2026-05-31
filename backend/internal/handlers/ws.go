package handlers

import (
	"log"
	"net/http"
	"task-tracker/internal/middleware"
	"task-tracker/internal/ws"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins — CORS is handled by Gin middleware globally.
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSHandler struct {
	hub       *ws.Hub
	jwtSecret string
}

func NewWSHandler(hub *ws.Hub, jwtSecret string) *WSHandler {
	return &WSHandler{hub: hub, jwtSecret: jwtSecret}
}

// ServeWS upgrades the HTTP connection to WebSocket.
// Auth is via ?token=<access_token> query param because browsers cannot
// send custom headers during the WebSocket handshake.
func (h *WSHandler) ServeWS(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := ws.NewClient(claims.UserID, claims.OrgID, h.hub, conn)
	h.hub.Register(client)
	log.Printf("ws: user %s connected", claims.UserID)

	// Send immediate confirmation.
	client.SendMsg(ws.OutMsg{Type: ws.MsgConnected})

	go client.WritePump()
	client.ReadPump() // blocks until client disconnects
}
