-- Update messages table status constraint
ALTER TABLE messages DROP CONSTRAINT messages_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_status_check CHECK (status IN ('pending', 'sent', 'replied', 'failed'));
