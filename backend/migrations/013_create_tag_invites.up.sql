-- Create tag_invites table
CREATE TABLE tag_invites (
    id SERIAL PRIMARY KEY,
    tag_id INTEGER NOT NULL,
    email VARCHAR(128) NOT NULL,
    sender_id INTEGER NOT NULL,
    access_level INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    notified_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    CONSTRAINT fk_invite_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_invites_email ON tag_invites(email);
CREATE INDEX idx_tag_invites_status ON tag_invites(status);
