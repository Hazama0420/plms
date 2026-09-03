ALTER TABLE public.ai_user_overrides
ADD COLUMN IF NOT EXISTS created_by uuid
REFERENCES public.users(id)
ON DELETE SET NULL;

ALTER TABLE public.ai_user_overrides
ADD COLUMN IF NOT EXISTS updated_by uuid
REFERENCES public.users(id)
ON DELETE SET NULL;