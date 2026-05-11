package db

import (
	"database/sql"
	"fmt"
	"strconv"
)

// SetTagSetting updates or inserts a setting for a tag+user combination.
func SetTagSetting(tagID int, userID int, setting, value string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `
		INSERT INTO tag_settings (tagid, userid, setting, value)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (tagid, userid, setting)
		DO UPDATE SET value = EXCLUDED.value`
	_, err := db.Exec(query, tagID, userID, setting, value)
	return err
}

// GetTagSetting retrieves a setting value for a tag+user combination.
func GetTagSetting(tagID int, userID int, setting string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database not initialized")
	}
	const query = "SELECT value FROM tag_settings WHERE tagid = $1 AND userid = $2 AND setting = $3"
	var value string
	err := db.QueryRow(query, tagID, userID, setting).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return value, nil
}

// GetTagSettings retrieves all settings for a tag+user combination.
func GetTagSettings(tagID int, userID int) (map[string]string, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = "SELECT setting, value FROM tag_settings WHERE tagid = $1 AND userid = $2"
	rows, err := db.Query(query, tagID, userID)
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

// DeleteTagSetting removes a setting for a tag+user combination.
func DeleteTagSetting(tagID int, userID int, setting string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = "DELETE FROM tag_settings WHERE tagid = $1 AND userid = $2 AND setting = $3"
	_, err := db.Exec(query, tagID, userID, setting)
	return err
}

// GetTagSettingBool retrieves a setting and converts it to a boolean.
func GetTagSettingBool(tagID int, userID int, setting string, defaultValue bool) (bool, error) {
	val, err := GetTagSetting(tagID, userID, setting)
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

// GetTagSettingInt retrieves a setting and converts it to an integer.
func GetTagSettingInt(tagID int, userID int, setting string, defaultValue int) (int, error) {
	val, err := GetTagSetting(tagID, userID, setting)
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

// SetTagSettingBool saves a boolean setting for a tag+user combination.
func SetTagSettingBool(tagID int, userID int, setting string, value bool) error {
	return SetTagSetting(tagID, userID, setting, strconv.FormatBool(value))
}

// SetTagSettingInt saves an integer setting for a tag+user combination.
func SetTagSettingInt(tagID int, userID int, setting string, value int) error {
	return SetTagSetting(tagID, userID, setting, strconv.Itoa(value))
}