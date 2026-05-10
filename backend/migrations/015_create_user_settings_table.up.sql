CREATE TABLE IF NOT EXISTS user_settings (
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting VARCHAR(64) NOT NULL,
    value VARCHAR(256) NOT NULL,
    PRIMARY KEY (userid, setting)
);
