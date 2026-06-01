-- Restrict account creation to @adt.com email addresses.
-- Enforced at the database level so it cannot be bypassed by calling the
-- auth API directly. A friendly client-side check in the login form gives
-- users a clear message; this trigger is the hard backstop.

create or replace function public.enforce_adt_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or lower(split_part(new.email, '@', 2)) <> 'adt.com' then
    raise exception 'Sign-ups are restricted to @adt.com email addresses';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_adt_email_domain_trigger on auth.users;
create trigger enforce_adt_email_domain_trigger
  before insert on auth.users
  for each row execute function public.enforce_adt_email_domain();
