package email

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/larsa/pwa-counter/backend/internal/db"
	"gopkg.in/gomail.v2"
)

// SendEmail sends a simple email with subject and body.
func SendEmail(to, subject, body string) error {
	// Check if the recipient is a user and has an alternative email configured
	if userID, err := db.GetUserIDByEmail(to); err == nil {
		if altEmail, err := db.GetUserSetting(userID, "notification_email"); err == nil && altEmail != "" {
			to = altEmail
		}
	}

	sender := "CrudBytes Apps <apps@crudbytes.com>"
	
	// SMTP configuration from environment variables
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpPort, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		log.Printf("Invalid SMTP_PORT: %v. Skipping email to %s.", err, to)
		return nil
	}
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Printf("SMTP configuration is missing. Skipping email to %s. (Host: %s, User: %s)", to, smtpHost, smtpUser)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", sender)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(smtpHost, smtpPort, smtpUser, smtpPass)

	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
