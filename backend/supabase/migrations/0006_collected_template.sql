-- Message for the "Mark collected" step (D-056): a private setting like the other WhatsApp templates. Adds a row only; never overwrites.
insert into public.settings (key, value)
values ('wa_template_collected', to_jsonb('Hi {name}, thank you for collecting your order {order_number}. We hope you enjoy your momo!'::text))
on conflict (key) do nothing;
