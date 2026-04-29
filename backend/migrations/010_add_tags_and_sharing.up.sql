-- Create tags, counter_tags, and tag_shares tables
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(64) NOT NULL,
    createtime TIMESTAMP NOT NULL DEFAULT NOW(),
    deletetime TIMESTAMP,
    CONSTRAINT fk_tag_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE counter_tags (
    counter_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (counter_id, tag_id),
    CONSTRAINT fk_counter FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
    CONSTRAINT fk_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE tag_shares (
    tag_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (tag_id, user_id),
    CONSTRAINT fk_share_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_user ON tags(user_id);
CREATE INDEX idx_counter_tags_tag ON counter_tags(tag_id);
CREATE INDEX idx_tag_shares_user ON tag_shares(user_id);
