-- Create meal_plans table
-- This table stores customizable meal plan options with pricing

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL, -- Short code like 'EP', 'CP', 'MAP', 'AP'
  name VARCHAR(100) NOT NULL, -- Display name like 'Room Only', 'Breakfast Included'
  description TEXT, -- Optional detailed description
  price_per_person DECIMAL(10,2) DEFAULT 0.00, -- Additional price per person per night
  is_active BOOLEAN DEFAULT true, -- Enable/disable without deleting
  sort_order INTEGER DEFAULT 0, -- For ordering in dropdowns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_meal_plans_active ON meal_plans(is_active);
CREATE INDEX idx_meal_plans_sort_order ON meal_plans(sort_order);

-- Insert default meal plans to match current system
-- Using the EP/CP/MAP/AP naming convention
INSERT INTO meal_plans (code, name, description, price_per_person, sort_order) VALUES
  ('EP', 'EP (Room Only)', 'European Plan - Room only, no meals included', 0.00, 1),
  ('CP', 'CP (Breakfast)', 'Continental Plan - Room with breakfast', 200.00, 2),
  ('MAP', 'MAP (Breakfast + Dinner)', 'Modified American Plan - Room with breakfast and dinner', 500.00, 3),
  ('AP', 'AP (All Meals)', 'American Plan - Room with all meals (breakfast, lunch, dinner)', 800.00, 4);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_plans_updated_at();

-- Add comment to table
COMMENT ON TABLE meal_plans IS 'Stores customizable meal plan options with pricing for hotel reservations';
COMMENT ON COLUMN meal_plans.code IS 'Short unique code used in system (e.g., EP, CP, MAP, AP)';
COMMENT ON COLUMN meal_plans.price_per_person IS 'Additional charge per person per night for this meal plan';
COMMENT ON COLUMN meal_plans.is_active IS 'Inactive meal plans are hidden from selection but preserve historical data';
