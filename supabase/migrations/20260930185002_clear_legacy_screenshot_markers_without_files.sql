update public.logs set screenshot = false, updated_at = now() where screenshot = true and screenshot_path is null;
