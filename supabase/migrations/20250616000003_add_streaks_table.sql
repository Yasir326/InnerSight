-- Create user_streaks table to store streak analytics
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_days_with_entries INTEGER DEFAULT 0,
  streak_percentage INTEGER DEFAULT 0, -- percentage of days with entries in last 30 days
  last_entry_date DATE,
  streak_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for user_streaks
CREATE POLICY "Users can view own streak data" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak data" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak data" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create function to update streaks when journal entries are added
CREATE OR REPLACE FUNCTION update_user_streaks()
RETURNS TRIGGER AS $$
DECLARE
  entry_date DATE;
  user_streak_record RECORD;
  new_current_streak INTEGER := 0;
  new_longest_streak INTEGER := 0;
  total_days INTEGER := 0;
  streak_percentage INTEGER := 0;
  unique_dates DATE[];
  last_date DATE;
  days_diff INTEGER;
BEGIN
  -- Get the date of the new entry (without time)
  entry_date := DATE(NEW.created_at);
  
  -- Get current streak record for user
  SELECT * INTO user_streak_record 
  FROM user_streaks 
  WHERE user_id = NEW.user_id;
  
  -- Get all unique dates for this user (including the new entry)
  SELECT ARRAY_AGG(DISTINCT DATE(created_at) ORDER BY DATE(created_at) DESC)
  INTO unique_dates
  FROM journal_entries 
  WHERE user_id = NEW.user_id;
  
  -- Calculate total unique days
  total_days := array_length(unique_dates, 1);
  
  -- Calculate current streak
  IF total_days > 0 THEN
    new_current_streak := 1;
    last_date := unique_dates[1]; -- Most recent date
    
    FOR i IN 2..total_days LOOP
      days_diff := last_date - unique_dates[i];
      
      IF days_diff = 1 THEN
        new_current_streak := new_current_streak + 1;
        last_date := unique_dates[i];
      ELSIF days_diff > 1 THEN
        EXIT; -- Streak broken
      END IF;
      -- If days_diff = 0, same day, continue
    END LOOP;
  END IF;
  
  -- Calculate longest streak
  IF total_days > 0 THEN
    DECLARE
      current_calc_streak INTEGER := 1;
      max_streak INTEGER := 1;
    BEGIN
      FOR i IN 2..total_days LOOP
        days_diff := unique_dates[i-1] - unique_dates[i];
        
        IF days_diff = 1 THEN
          current_calc_streak := current_calc_streak + 1;
          max_streak := GREATEST(max_streak, current_calc_streak);
        ELSE
          current_calc_streak := 1;
        END IF;
      END LOOP;
      
      new_longest_streak := max_streak;
    END;
  END IF;
  
  -- Calculate streak percentage (last 30 days)
  SELECT COUNT(DISTINCT DATE(created_at)) * 100 / 30
  INTO streak_percentage
  FROM journal_entries 
  WHERE user_id = NEW.user_id 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Insert or update streak record
  IF user_streak_record IS NULL THEN
    INSERT INTO user_streaks (
      user_id, 
      current_streak, 
      longest_streak, 
      total_days_with_entries,
      streak_percentage,
      last_entry_date,
      streak_updated_at
    ) VALUES (
      NEW.user_id,
      new_current_streak,
      new_longest_streak,
      total_days,
      LEAST(streak_percentage, 100),
      entry_date,
      NOW()
    );
  ELSE
    UPDATE user_streaks SET
      current_streak = new_current_streak,
      longest_streak = GREATEST(user_streak_record.longest_streak, new_longest_streak),
      total_days_with_entries = total_days,
      streak_percentage = LEAST(streak_percentage, 100),
      last_entry_date = entry_date,
      streak_updated_at = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streaks when journal entries are added
CREATE TRIGGER update_streaks_on_entry_insert
  AFTER INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_user_streaks();

-- Create function to handle streak updates when entries are deleted
CREATE OR REPLACE FUNCTION recalculate_user_streaks_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate streaks for the user after deletion
  -- This is a simplified approach - in production you might want to optimize this
  PERFORM update_user_streaks_for_user(OLD.user_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to recalculate streaks for a specific user
CREATE OR REPLACE FUNCTION update_user_streaks_for_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_streak_record RECORD;
  new_current_streak INTEGER := 0;
  new_longest_streak INTEGER := 0;
  total_days INTEGER := 0;
  streak_percentage INTEGER := 0;
  unique_dates DATE[];
  last_date DATE;
  days_diff INTEGER;
BEGIN
  -- Get all unique dates for this user
  SELECT ARRAY_AGG(DISTINCT DATE(created_at) ORDER BY DATE(created_at) DESC)
  INTO unique_dates
  FROM journal_entries 
  WHERE user_id = target_user_id;
  
  -- If no entries, reset everything
  IF unique_dates IS NULL OR array_length(unique_dates, 1) = 0 THEN
    DELETE FROM user_streaks WHERE user_id = target_user_id;
    RETURN;
  END IF;
  
  -- Calculate total unique days
  total_days := array_length(unique_dates, 1);
  
  -- Calculate current streak
  new_current_streak := 1;
  last_date := unique_dates[1]; -- Most recent date
  
  FOR i IN 2..total_days LOOP
    days_diff := last_date - unique_dates[i];
    
    IF days_diff = 1 THEN
      new_current_streak := new_current_streak + 1;
      last_date := unique_dates[i];
    ELSIF days_diff > 1 THEN
      EXIT; -- Streak broken
    END IF;
  END LOOP;
  
  -- Calculate longest streak
  DECLARE
    current_calc_streak INTEGER := 1;
    max_streak INTEGER := 1;
  BEGIN
    FOR i IN 2..total_days LOOP
      days_diff := unique_dates[i-1] - unique_dates[i];
      
      IF days_diff = 1 THEN
        current_calc_streak := current_calc_streak + 1;
        max_streak := GREATEST(max_streak, current_calc_streak);
      ELSE
        current_calc_streak := 1;
      END IF;
    END LOOP;
    
    new_longest_streak := max_streak;
  END;
  
  -- Calculate streak percentage (last 30 days)
  SELECT COUNT(DISTINCT DATE(created_at)) * 100 / 30
  INTO streak_percentage
  FROM journal_entries 
  WHERE user_id = target_user_id 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Update or insert streak record
  INSERT INTO user_streaks (
    user_id, 
    current_streak, 
    longest_streak, 
    total_days_with_entries,
    streak_percentage,
    last_entry_date,
    streak_updated_at
  ) VALUES (
    target_user_id,
    new_current_streak,
    new_longest_streak,
    total_days,
    LEAST(streak_percentage, 100),
    unique_dates[1],
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    total_days_with_entries = EXCLUDED.total_days_with_entries,
    streak_percentage = EXCLUDED.streak_percentage,
    last_entry_date = EXCLUDED.last_entry_date,
    streak_updated_at = EXCLUDED.streak_updated_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to recalculate streaks when entries are deleted
CREATE TRIGGER recalculate_streaks_on_entry_delete
  AFTER DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION recalculate_user_streaks_on_delete(); 