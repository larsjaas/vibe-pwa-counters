package db

import (
	"database/sql"
	"fmt"
	"strconv"
)

// SetUserSetting updates or inserts a setting for a user.
func SetUserSetting(userID int, setting, value string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `
		INSERT INTO user_settings (userid, setting, value)
		VALUES ($1, $2, $3)
		ON CONFLICT (userid, setting)
		DO UPDATE SET value = EXCLUDED.value`
	_, err := db.Exec(query, userID, setting, value)
	return err
}

// GetUserSetting retrieves a setting value for a user.
func GetUserSetting(userID int, setting string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database not initialized")
	}
	const query = "SELECT value FROM user_settings WHERE userid = $1 AND setting = $2"
	var value string
	err := db.QueryRow(query, userID, setting).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return value, nil
}

// GetUserSettings retrieves all settings for a user.
func GetUserSettings(userID int) (map[string]string, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = "SELECT setting, value FROM user_settings WHERE userid = $1"
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var s, v string
		if err := rows.Scan(&s, &v); err != nil {
			return nil, err
		}
		settings[s] = v
	}
	return settings, nil
}

// DeleteUserSetting removes a setting for a user.
func DeleteUserSetting(userID int, setting string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = "DELETE FROM user_settings WHERE userid = $1 AND setting = $2"
	_, err := db.Exec(query, userID, setting)
	return err
}

// GetUserSettingBool retrieves a setting and converts it to a boolean.
func GetUserSettingBool(userID int, setting string, defaultValue bool) (bool, error) {
	val, err := GetUserSetting(userID, setting)
	if err != nil {
		return defaultValue, err
	}
	if val == "" {
		return defaultValue, nil
	}
	b, err := strconv.ParseBool(val)
	if err != nil {
		return defaultValue, err
	}
	return b, nil
}

// GetUserSettingInt retrieves a setting and converts it to an integer.
func GetUserSettingInt(userID int, setting string, defaultValue int) (int, error) {
	val, err := GetUserSetting(userID, setting)
	if err != nil {
		return defaultValue, err
	}
	if val == "" {
		return defaultValue, nil
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultValue, err
	}
	return i, nil
}

// SetUserSettingBool saves a boolean setting.
func SetUserSettingBool(userID int, setting string, value bool) error {
	return SetUserSetting(userID, setting, strconv.FormatBool(value))
}

// SetUserSettingInt saves an integer setting.
func SetUserSettingInt(userID int, setting string, value int) error {
	return SetUserSetting(userID, setting, strconv.Itoa(value))
}
