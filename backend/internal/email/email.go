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
		log.Printf("Invalid SMTP_PORT: %v. Skipping email to %s (Subject: %s).", err, to, subject)
		return nil
	}
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Printf("SMTP configuration is missing. Skipping email to %s (Subject: %s). (Host: %s, User: %s)", to, subject, smtpHost, smtpUser)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", sender)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(smtpHost, smtpPort, smtpUser, smtpPass)

	log.Printf("Sending email: To=%s, Subject=%s", to, subject)
	if err := d.DialAndSend(m); err != nil {
		log.Printf("Email failed: To=%s, Subject=%s, Error=%v", to, subject, err)
		return fmt.Errorf("failed to send email: %w", err)
	}
	log.Printf("Email sent successfully: To=%s, Subject=%s", to, subject)

	return nil
}
