-- Update profile constraints and indexes
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS username_format,
  ADD CONSTRAINT username_format CHECK (
    username ~* '^[a-z][a-z0-9_]*$' AND
    length(username) >= 3 AND
    length(username) <= 20
  );

-- Add unique constraint for username (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON profiles (lower(username));

-- Add function to handle username conflicts
CREATE OR REPLACE FUNCTION handle_username_conflict()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  new_username TEXT;
  counter INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.username <> OLD.username THEN
    base_username := NEW.username;
    new_username := base_username;
    
    WHILE EXISTS (
      SELECT 1 FROM profiles 
      WHERE lower(username) = lower(new_username)
      AND id <> NEW.id
    ) LOOP
      counter := counter + 1;
      new_username := base_username || counter::TEXT;
    END LOOP;
    
    NEW.username := new_username;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for username uniqueness
DROP TRIGGER IF EXISTS ensure_username_unique ON profiles;
CREATE TRIGGER ensure_username_unique
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_username_conflict();