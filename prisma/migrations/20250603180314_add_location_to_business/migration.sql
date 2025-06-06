ALTER TABLE "Business"
ADD COLUMN "location" geography(Point, 4326);

CREATE OR REPLACE FUNCTION update_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_location
BEFORE INSERT OR UPDATE
ON "Business"
FOR EACH ROW
EXECUTE FUNCTION update_location();