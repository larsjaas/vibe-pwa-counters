CREATE TABLE tag_settings (
    tagid INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting VARCHAR(32) NOT NULL,
    value VARCHAR(32) NOT NULL,
    PRIMARY KEY (tagid, userid, setting)
);

CREATE INDEX idx_tag_settings_user ON tag_settings(userid);