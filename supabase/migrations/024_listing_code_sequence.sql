CREATE SEQUENCE IF NOT EXISTS property_listing_seq START 1;

CREATE OR REPLACE FUNCTION next_listing_number()
RETURNS int LANGUAGE sql SECURITY DEFINER AS
$$ SELECT nextval('property_listing_seq')::int; $$;
