-- Fix ambiguous column error in streaks functions
-- Rename streak_percentage variable to calc_streak_percentage to avoid conflict with column name

-- Update the main streak update function
CREATE OR REPLACE FUNCTION update_user_streaks()
RETURNS TRIGGER AS $$
DECLARE
  entry_date DATE;
  user_streak_record RECORD;
  new_current_streak INTEGER := 0;
  new_longest_streak INTEGER := 0;
  total_days INTEGER := 0;
  calc_streak_percentage INTEGER := 0;
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
  INTO calc_streak_percentage
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
      LEAST(calc_streak_percentage, 100),
      entry_date,
      NOW()
    );
  ELSE
    UPDATE user_streaks SET
      current_streak = new_current_streak,
      longest_streak = GREATEST(user_streak_record.longest_streak, new_longest_streak),
      total_days_with_entries = total_days,
      streak_percentage = LEAST(calc_streak_percentage, 100),
      last_entry_date = entry_date,
      streak_updated_at = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the helper function for recalculating streaks
CREATE OR REPLACE FUNCTION update_user_streaks_for_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_streak_record RECORD;
  new_current_streak INTEGER := 0;
  new_longest_streak INTEGER := 0;
  total_days INTEGER := 0;
  calc_streak_percentage INTEGER := 0;
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
  INTO calc_streak_percentage
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
    LEAST(calc_streak_percentage, 100),
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